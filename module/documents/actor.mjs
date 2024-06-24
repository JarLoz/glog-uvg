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

  async rollDD() {
    let d = new Dialog({
      title: "Rolling Death and Dismemberment!",
      content: "<div class='dialog grid grid-2-col'>\
      <label for='location'>Location?</label>\
      <select id='location' name='location'>\
        <option value='random' selected='selected'>Random</option>\
        <option value='arm'>Arm</option>\
        <option value='leg'>Leg</option>\
        <option value='torso'>Torso</option>\
        <option value='head'>Head</option>\
        <option value='fire'>Acid, Fire</option>\
        <option value='ice'>Cold, Ice</option>\
        <option value='lightning'>Lightning</option>\
        <option value='venom'>Venom, Toxin</option>\
        <option value='magic'>Magic</option>\
      </select>\
      </div>\
      ",
      buttons: {
        one: {
          icon: '<i class="fas fa-check"></i>',
          label: 'Roll!',
          callback: (html) => this._rollDnD(html.find('[id=\"location\"]')[0].value)
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

  async addFatalWound() {
    let fatalWounds = this.system.fatalWounds;
    fatalWounds[3] = fatalWounds[3] + 1;
    let actorUpdate = {
      "system.fatalWounds": fatalWounds
    };
    await this.update(actorUpdate);
    let template = "systems/glog-uvg/templates/chat/add-wound.html";
    let templateData = {
      fatalWounds: fatalWounds,
      img: this.img
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.id,
        token: this.token,
        alias: this.name
      },
      sound: CONFIG.sounds.notification
    };
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  async removeFatalWound() {
    let fatalWounds = this.system.fatalWounds;
    fatalWounds.every((val, index) => {
      if (val > 0) {
        fatalWounds[index] = val - 1;
        return false;
      }
      return true;
    });
    let actorUpdate = {
      "system.fatalWounds": fatalWounds
    };
    await this.update(actorUpdate);
    let template = "systems/glog-uvg/templates/chat/remove-wound.html";
    let templateData = {
      fatalWounds: fatalWounds,
      img: this.img
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.id,
        token: this.token,
        alias: this.name
      },
      sound: CONFIG.sounds.notification
    };
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  async tickFatalWound() {
    let fatalWounds = this.system.fatalWounds;
    fatalWounds.every((val, index) => {
      if (index == 0) {
        fatalWounds[index] = fatalWounds[index] + fatalWounds[index+1];
      } else if (index < 3) {
        fatalWounds[index] = fatalWounds[index+1];
      } else {
        fatalWounds[index] = 0;
      }
      return true;
    });
    let actorUpdate = {
      "system.fatalWounds": fatalWounds
    };
    await this.update(actorUpdate);
    let template = "systems/glog-uvg/templates/chat/tick-wound.html";
    let templateData = {
      fatalWounds: fatalWounds,
      img: this.img
    };

    let chatData = {
      user: game.user.id,
      speaker: {
        actor: this.id,
        token: this.token,
        alias: this.name
      },
      sound: CONFIG.sounds.notification
    };
    renderTemplate(template, templateData).then(content => {
      chatData.content = content;
      ChatMessage.create(chatData);
    });
  }

  async rollHitDice() {
    if (this.type != 'npc') {
      console.log("This ain't an NPC yo!");
      return;
    }
    const hitdice = String(this.system.hd.value);
    const hitdicerest = String(this.system.hd.die);
    let formula = hitdice + hitdicerest

    let roll = new Roll(formula);
    await roll.evaluate();
    let hp = roll.total;
    hp = Math.max(hp, 1);

    const actorUpdates = {
        "system.hp.value": hp,
        "system.hp.max": hp,
    };
    await this.update(actorUpdates);
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
      <input id='modifier' name='modifier' type='number' value='"+prevRollMod+"'></input>\
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
      },
      default: 'one'
    });
    d.render(true);
  }

  async _rollUnder(value, statname, bonus, key, ability) {
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
    await roll.evaluate();
    let result = roll.total;
    let success = (result <= target);

    let templateData = {
      statname: statname,
      targetvalue: target,
      targetcalc: targetcalc,
      rollvalue: result,
      success: success,
      img: this.img
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

  async _rollDnD(loc) {
    let hitLocation = loc;
    let injuries = 0;
    for (let i of this.items) {
      if (i.type === 'injury') {
        injuries++;
      }
    }
    let formula = "d12 + " + (this.system.hp.value * -1) + " + " + injuries;
    let roll = new Roll(formula, this.getRollData());
    await roll.evaluate();
    let xvalue = roll.total;

    let fatalwounds = 0;
    let majorinjury = false;
    
    if (xvalue >= 11) {
      fatalwounds = 1;
      majorinjury = true;
    }

    if (xvalue >= 16) {
      fatalwounds += xvalue - 15;
    }

    if (hitLocation === "random") {
      let locRoll = new Roll("1d6");
      await locRoll.evaluate();
      switch (locRoll.total) {
        case 1:
          hitLocation = "arm";
          break;
        case 2:
          hitLocation = "leg";
          break;
        case 3:
        case 4:
          hitLocation = "torso";
          break;
        case 5:
        case 6:
          hitLocation = "head";
          break;
      }
    }

    let minorInjuryName = "Minor injury";
    let majorInjuryName = "Major injury";
    let hitText = "Hit";
    console.log("Got hit to " + hitLocation);

    switch (hitLocation) {
      case "arm":
        minorInjuryName = "Arm disabled";
        majorInjuryName = "Arm mangled";
        hitText = "Hit on arm";
        break;
      case "leg":
        minorInjuryName = "Leg disabled";
        majorInjuryName = "Leg mangled";
        hitText = "Hit on leg";
        break;
      case "torso":
        minorInjuryName = "Cracked ribs";
        majorInjuryName = "Crushed";
        hitText = "Hit on torso";
        break;
      case "head":
        minorInjuryName = "Concussed";
        majorInjuryName = "Skull cracked";
        hitText = "Hit on head";
        break;
      case "fire":
        minorInjuryName = "Scorched";
        majorInjuryName = "Burned";
        hitText = "Burned by fire/acid";
        break;
      case "ice":
        minorInjuryName = "Frostbite";
        majorInjuryName = "Frozen";
        hitText = "Touched by ice/cold";
        break;
      case "lightning":
        minorInjuryName = "Burned";
        majorInjuryName = "Fried";
        hitText = "Hit by lightning";
        break;
      case "venom":
        minorInjuryName = "Sickened";
        majorInjuryName = "Wracked";
        hitText = "Afflicted by venom/toxin";
        break;
      case "magic":
        minorInjuryName = "Anathema";
        majorInjuryName = "Marked";
        hitText = "Scourged by magic";
        break;
    }

    let templateData = {
      hitText: hitText,
      formula: formula,
      xvalue: xvalue,
      majorinjury: majorinjury,
      minorInjuryName: minorInjuryName,
      majorInjuryName: majorInjuryName,
      fatalwounds: fatalwounds,
      img: this.img
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
