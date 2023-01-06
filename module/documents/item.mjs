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
    } else {
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[${item.type}] ${item.name}`;
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? ''
      });
    }

  }

  _showAttackRollDialog() {
    let target = this.actor.system.primaryStats.attack.total;
    let prevRollModifier = this.actor.system.primaryStats.attack.prevRollMod;
    let d = new Dialog({
      title: `Attacking with ${this.name}!`,
      content: "<div class='dialog attack-dialog grid grid-2-col'>\
      <div class='target flex-group-center'>\
      <div class='target-header'>Target:</div>\
      <div class='target-value'>" + target + "</div>\
      </div>\
      <div class='modifier flex-group-center'>\
      <label for='modifier'>Modifier?</label>\
      <input id='modifier' name='modifier' type='text' size='3' value='"+prevRollModifier +"'></input>\
      </div>\
      <div class='damage flex-group-center'>\
      <div class='damage-header'>Damage:</div>\
      <div class='damage-value'>" + this.system.damage + "</div>\
      </div>\
      <div class='dmg-modifier flex-group-center'>\
      <label for='dmg-modifier'>Damage modifier?</label>\
      <input id='dmg-modifier' name='dmg-modifier' type='text' size='6' value=''></input>\
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
          callback: (html) => this._rollDamage()
        },
        three: {
          icon: '<i class="fas fa-ban"></i>',
          label: 'Cancel',
          callback: () => {}
        }
      }
    });
    d.render(true);
  }

  _rollAttack(modifier, damageModifier) {
    let weapon = this;

    let hitroll = new Roll("d20", this.actor.getRollData());
    hitroll.evaluate({async: false});
    let hitrollresult = hitroll.total;

    let damageformula = weapon.system.damage;

    if (damageModifier) {
      damageformula += ' + ' + damageModifier;
    }

    let damageroll = new Roll(damageformula, this.actor.getRollData());
    damageroll.evaluate({async: false});
    let damagerollresult = damageroll.total;

    let attack = this.actor.system.primaryStats.attack.total;

    let bonusval = parseInt(modifier);
    if (isNaN(bonusval)) {
      bonusval = 0;
    }
    let update = {system:{primaryStats:{attack:{prevRollMod:bonusval}}}};
    console.log(update);
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

    let templateData = {
      weaponname: weapon.name,
      targetvalue: target,
      targetcalc: targetcalc,
      rollvalue: hitrollresult,
      damagevalue: damagerollresult,
      weapondamageroll: damageformula,
      success: success
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

  _rollDamage() {
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
      }
    });
    d.render(true);
  }

  _rollCasting(dice) {
    let formula = dice + "d6";
    let castroll = new Roll(formula, this.actor.getRollData());
    let rollResult =  castroll.evaluate({async: false});
    let terms = rollResult.terms[0].results.map(o => {return o.result;});

    let templateData = {
      spellname: this.name,
      description: this.description,
      formula: formula,
      count: dice,
      resultstring: "(" + terms.toString() + ")",
      total: rollResult.total
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
