import {evaluateOpposed} from "../helpers/rollhelpers.mjs";
/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class BoilerplateItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;
    if (this.type == "weapon"){
      this._showAttackRollDialog();
    } else if (this.type == "spell") {
      this._showSpellRollDialog();
    } else if (this.type == "caravanMember") {
      let templateData = {
        img: item.img,
        name: item.name,
        supply: item.system.supplyPerWeek,
        fuel: item.system.fuelPerWeek,
        cost: item.system.costPerWeek,
        capacity: item.system.capacity,
        description: item.system.description ?? ''
      };

      let chatData = {
        speaker: {
          actor: this.actor.id,
          token: this.actor.token,
          alias: this.actor.name
        },
        sound: CONFIG.sounds.notice
      }

      let template = "systems/glog-uvg/templates/chat/caravan-member.html";
      renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        ChatMessage.create(chatData);
      });
    } else {
      let templateData = {
        img: item.img,
        name: item.name,
        description: item.system.description ?? ''
      };

      let chatData = {
        speaker: {
          actor: this.actor.id,
          token: this.actor.token,
          alias: this.actor.name
        },
        sound: CONFIG.sounds.notice
      }

      let template = "systems/glog-uvg/templates/chat/description.html";
      renderTemplate(template, templateData).then(content => {
        chatData.content = content;
        ChatMessage.create(chatData);
      });
    }

  }

  _showAttackRollDialog() {
    let target = this.actor.system.primaryStats.attack.total;
    let prevRollModifier = this.actor.system.primaryStats.attack.prevRollMod;
    let d = new Dialog({
      title: `Attacking with ${this.name}!`,
      content: "<div class='dialog attack-dialog grid grid-3col'>\
      <div class='target flex-group-center'>\
      <div class='target-header'>Target:</div>\
      <div class='target-value'>" + target + "</div>\
      </div>\
      <div class='modifier flex-group-center'>\
      <label for='modifier'>Modifier?</label>\
      <input id='modifier' name='modifier' type='number' value='"+prevRollModifier +"'></input>\
      </div>\
      <div class='reload flex-group-center'>\
      <div class='reload-header'>Reload</div>\
      <div class='reload-header'>" + this.system.reload + "</div>\
      </div>\
      <div class='damage flex-group-center'>\
      <div class='damage-header'>Damage:</div>\
      <div class='damage-value'>" + this.system.damage + "</div>\
      </div>\
      <div class='dmg-modifier flex-group-center'>\
      <label for='dmg-modifier'>Damage modifier?</label>\
      <input id='dmg-modifier' name='dmg-modifier' type='number' size='6' value=''></input>\
      </div>\
      </div>\
      ",
      buttons: {
        one: {
          icon: '<i class="fas fa-swords"></i>',
          label: 'Attack!',
          callback: (html) => this._rollAttack(html.find('[id=\"modifier\"]')[0].value,html.find('[id=\"dmg-modifier\"]')[0].value)
        },
        two: {
          icon: '<i class="fas fa-swords"></i>',
          label: 'Damage!',
          callback: (html) => this._rollDamage(html.find('[id=\"dmg-modifier\"]')[0].value)
        },
        three: {
          icon: '<i class="fas fa-ban"></i>',
          label: 'Cancel',
          callback: () => {}
        }
      },
      default: 'one',
    });
    d.render(true);
  }

  async _rollAttack(modifier, damageModifier) {
    let weapon = this;

    let hitroll = new Roll("d20", this.actor.getRollData());
    await hitroll.evaluate();
    let hitrollresult = hitroll.total;

    let damageformula = weapon.system.damage;

    if (damageModifier) {
      damageformula += ' + ' + damageModifier;
    }

    let damageroll = new Roll(damageformula, this.actor.getRollData());
    await damageroll.evaluate();
    let damagerollresult = damageroll.total;

    let attack = this.actor.system.primaryStats.attack.total;

    let bonusval = parseInt(modifier);
    if (isNaN(bonusval)) {
      bonusval = 0;
    }
    let update = {system:{primaryStats:{attack:{prevRollMod:bonusval}}}};
    this.actor.update(update);

    let target = attack + bonusval;

    let targetcalc = false;
    if (bonusval > 0) {
      targetcalc = `${attack} + ${bonusval}`;
    }
    if (bonusval < 0) {
      targetcalc = `${attack} - ${bonusval * -1}`;
    }

    let success = (hitrollresult <= target);

    let reloadrequired = false;
    if (this.system.reload > 0) {
      reloadrequired = (hitrollresult >= this.system.reload)
    }

    let templateData = {
      weaponname: weapon.name,
      targetvalue: target,
      targetcalc: targetcalc,
      rollvalue: hitrollresult,
      damagevalue: damagerollresult,
      weapondamageroll: damageformula,
      success: success,
      img: weapon.img,
      reloadrequired: reloadrequired,
      reload : this.system.reload,
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name
      },
      sound: CONFIG.sounds.dice
    };

    let template = "systems/glog-uvg/templates/chat/roll-attack.html";
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  async _rollDamage(damageModifier) {
    let weapon = this;
    let damageformula = weapon.system.damage;

    if (damageModifier) {
      damageformula += ' + ' + damageModifier;
    }
    let damageroll = new Roll(damageformula, this.actor.getRollData());
    await damageroll.evaluate();
    let damagerollresult = damageroll.total;

    let templateData = {
      weaponname: weapon.name,
      damagevalue: damagerollresult,
      weapondamageroll: damageformula,
      img: weapon.img
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name
      },
      sound: CONFIG.sounds.dice
    };

    let template = "systems/glog-uvg/templates/chat/roll-damage.html";
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  _showSpellRollDialog() {
    let d = new Dialog({
      title: `Casting ${this.name}!`,
      content: `<div class='dialog casting-dialog grid grid-2-col'>\
      <div class='target flex-group-center'>\
      ${this.system.description}\
      </div>\
      <div class='dice flex-group-center'>\
      <label for='dice'>Magic Dice?</label>\
      <input id='dice' name='dice' type='number' min='1' max='10' size='3' value='1'></input>\
      </div>\
      </div>\
      `,
      buttons: {
        one: {
          icon: '<i class="fas fa-swords"></i>',
          label: 'Cast!',
          callback: (html) => this._rollCasting(html.find('[id=\"dice\"]')[0].value)
        },
        two: {
          icon: '<i class="fas fa-ban"></i>',
          label: 'Cancel',
          callback: () => {}
        }
      },
      default: 'one'
    });
    d.render(true);
  }

  _rollCasting(dice) {
    let formula = dice + "d6";
    let castroll = new Roll(formula, this.actor.getRollData());
    let rollResult =  castroll.evaluate({async: false});
    let terms = rollResult.terms[0].results.map(o => {return o.result;});
    let mishap = false;
    let doom = false;
    let termcount = {};
    for (let term of terms) {
      if (term in termcount) {
        termcount[term]++;
      } else {
        termcount[term] = 1;
      }
      if (termcount[term] >= 2) {
        mishap = true;
      }
      if (termcount[term] >= 3) {
        doom = true;
      }
    }

    if (doom) {
      mishap = false;
    }

    let templateData = {
      spellname: this.name,
      description: this.system.description,
      formula: formula,
      count: dice,
      resultstring: "(" + terms.toString() + ")",
      total: rollResult.total,
      img: this.img,
      mishap: mishap,
      doom: doom
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name
      },
      sound: CONFIG.sounds.dice
    };

    let template = "systems/glog-uvg/templates/chat/roll-spell.html";
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

}
