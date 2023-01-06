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
    let d = new Dialog({
      title: `Attacking with ${this.name}`,
      content: "<div class='dialog grid grid-2-col'>\
      <div class='bonus flex-group-center'>\
      <label for='bonusval'>Bonus?</label>\
      <input id='bonusval' name='bonusval' type='text' size='3' value='0'></input>\
      </div>\
      <div class='opposed flex-group-center'>\
      <label for='opposedval'>Defence</label>\
      <input id='opposedval' name='opposedval' type='text' size='3' value='10'></input>\
      </div>\
      </div>\
      ",
      buttons: {
        one: {
          icon: '<i class="fas fa-swords"></i>',
          label: 'Attack!',
          callback: (html) => this._rollAttack(html.find('[id=\"bonusval\"]')[0].value, html.find('[id=\"opposedval\"]')[0].value)
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

  _rollAttack(bonus, defense) {
    let weapon = this;
    let hitroll = new Roll("d20", this.actor.getRollData());
    hitroll.evaluate({async: false});
    let damageroll = new Roll(weapon.system.damage, this.actor.getRollData());
    damageroll.evaluate({async: false});
    let opposedData = evaluateOpposed(this.actor.system.primaryStats.attack.total, bonus, defense);
    let hitrollresult = hitroll.total;
    let success = (hitrollresult <= opposedData.total);
    let damagerolltotal = damageroll.total;

    let templateData = {
      weaponname: weapon.name,
      targetvalue: opposedData.total,
      targetcalc: opposedData.formula,
      rollvalue: hitroll.total,
      damagevalue: damageroll.total,
      weapondamageroll: weapon.system.damage,
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
}
