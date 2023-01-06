/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class BoilerplateActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.boilerplate || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // Loop through ability scores, calculate totals and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      let value = ability.value + ability.mod;
      ability.total = value;
      if (value <= 2) ability.bonus = -3;
      if (value == 3 || value == 4 || value == 5) ability.bonus = -2;
      if (value == 6 || value == 7 || value == 8) ability.bonus = -1;
      if (value == 9 || value == 10 || value == 11) ability.bonus = 0;
      if (value == 12 || value == 13 || value == 14) ability.bonus = 1;
      if (value == 15 || value == 16 || value == 17) ability.bonus = 2;
      if (value == 18 || value == 19 || value == 20) ability.bonus = 3;
      if (value == 21 || value == 22 || value == 23) ability.bonus = 4;
      if (value >= 24) ability.bonus = 5;
    }

    for (let [key, stat] of Object.entries(systemData.primaryStats)) {
      stat.total = stat.value + stat.mod;
    }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    for (let [key, stat] of Object.entries(systemData.primaryStats)) {
      stat.total = stat.value + stat.mod;
    }
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  rollAbility(key) {
    let value = this.system.abilities[key].total;
    let statname = game.i18n.localize(CONFIG.BOILERPLATE.abilities[key]) ?? key;
    this._showRollDialog(statname, value, key, true);
  }

  rollStat(key) {
    let value = this.system.primaryStats[key].total;
    let statname = game.i18n.localize(CONFIG.BOILERPLATE.stats[key]) ?? key;
    this._showRollDialog(statname, value, key, false);
  }

  rollDD() {
    let d = new Dialog({
      title: "Rolling Death and Dismemberment!",
      content: "<div class='dialog grid grid-2-col'>\
      <label for='injuries'>Injuries?</label>\
      <input id='injuries' name='injuries' type='number' size='3' value='0'></input>\
      </div>\
      ",
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Roll!',
          callback: (html) => this._rollDnD(html.find('[id=\"injuries\"]')[0].value)
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

  _showRollDialog(statname, value, key, ability) {
    let prevRollMod = 0;
    if (ability) {
      prevRollMod = this.system.abilities[key].prevRollMod;
    } else {
      prevRollMod = this.system.primaryStats[key].prevRollMod;
    }
    let d = new Dialog({
      title: `Rolling d20 <= ${statname}!`,
      content: "<div class='dialog grid grid-2-col'>\
      <div class='target flex-group-center'>\
      <div class='target-header'>Target:</div>\
      <div class='target-header'>" + value + "</div>\
      </div>\
      <div class='modifier flex-group-center'>\
      <label for='modifier'>Modifier?</label>\
      <input id='modifier' name='modifier' type='text' size='3' value='"+prevRollMod+"'></input>\
      </div>\
      </div>\
      ",
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Roll!',
          callback: (html) => this._rollUnder(value, statname, html.find('[id=\"modifier\"]')[0].value, key, ability)
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

  _rollUnder(value, statname, bonus, key, ability) {
    let bonusval = parseInt(bonus);
    if (isNaN(bonusval)) {
      bonusval = 0;
    }
    let update = {};
    if (ability) {
      update = {system:{abilities:{}}};
      update.system.abilities[key] = {prevRollMod:bonusval};
    } else {
      update = {system:{primaryStats:{}}};
      update.system.primaryStats[key] = {prevRollMod:bonusval};
    }
    console.log(update);
    this.update(update);
    let target = value + bonusval;

    let targetcalc = false;
    if (bonusval > 0) {
      targetcalc = `${value} + ${bonusval}`;
    }
    if (bonusval < 0) {
      targetcalc = `${value} - ${bonusval * -1}`;
    }

    let roll = new Roll("d20", this.getRollData());
    roll.evaluate({async: false});
    let result = roll.total;
    let success = (result <= target);

    let templateData = {
      statname: statname,
      targetvalue: target,
      targetcalc: targetcalc,
      rollvalue: result,
      success: success
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.id,
        token: this.token,
        alias: this.name
      },
      sound: CONFIG.sounds.dice
    };

    let template = "systems/glog-uvg/templates/chat/roll-under.html";
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  _rollDnD(injuries) {
    let formula = "d12 + " + (this.system.hp.value * -1) + " + " + injuries;
    let roll = new Roll(formula, this.getRollData());
    roll.evaluate({async: false});
    let result = roll.total;

    let templateData = {
      formula: formula,
      rollvalue: result
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.id,
        token: this.token,
        alias: this.name
      },
      sound: CONFIG.sounds.dice
    };

    let template = "systems/glog-uvg/templates/chat/roll-dd.html";
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

}
