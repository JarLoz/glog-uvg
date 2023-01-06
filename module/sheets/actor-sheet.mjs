import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BoilerplateActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["boilerplate", "sheet", "actor"],
      template: "systems/glog-uvg/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/glog-uvg/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
      this._prepareNpcData(context);
    }

    if (actorData.type == 'caravan') {
      this._prepareCaravanItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.BOILERPLATE.abilityAbbreviationsCaps[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.primaryStats)) {
      v.label = game.i18n.localize(CONFIG.BOILERPLATE.stats[k]) ?? k;
    }
  }

  _prepareNpcData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.primaryStats)) {
      v.label = game.i18n.localize(CONFIG.BOILERPLATE.stats[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const quicks = [];
    const weapons = [];
    const equipment = [];
    const loot = [];
    const features = [];
    const spells = [];
    let usedSlots = 0;
    let usedQuickslots = 0;
    let spellSlotsFree = context.system.spellSlots;

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      let quick = false;
      i.img = i.img || DEFAULT_TOKEN;

      // Let's mangle some useful values
      if (i.type === 'weapon' || i.type === 'equipment' || i.type === 'loot'){
        usedSlots += i.system.slots;
        if (i.system.maxQuantity != 1) {
          i.hasQuantity = true;
        } else {
          i.hasQuantity = false;
        }
        if (i.system.quickslot === true) {
          quick = true;
          usedQuickslots++;
          quicks.push(i);
        }
        i.action = "-";
        if (i.type == 'weapon') {
          i.action = i.system.damage;
        }
      }

      // Append to gear.
      if (i.type === 'weapon' && !quick) {
        weapons.push(i);
      }
      if (i.type === 'equipment' && !quick) {
        equipment.push(i);
      }
      if (i.type === 'loot' && !quick) {
        loot.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.equipped) {
          spellSlotsFree--;
        }
        spells.push(i);
      }
    }

    // Assign and return
    context.quicks = quicks;
    context.weapons = weapons;
    context.equipment = equipment;
    context.loot = loot;
    context.features = features;
    context.spells = spells;
    context.usedSlots = usedSlots;
    context.usedQuickslots = usedQuickslots;
    context.spellSlotsFree = spellSlotsFree;
  }

  _prepareCaravanItems(context) {
    const members = [];
    const items = [];
    let supplyPerWeekTotal = 0;
    let fuelPerWeekTotal = 0;
    let costPerWeekTotal = 0;
    let capacityTotal = 0;
    let capacityUsed = 0;

    for (let i of context.items) {
      if (i.type === 'caravanMember') {
        supplyPerWeekTotal += i.system.supplyPerWeek;
        fuelPerWeekTotal += i.system.fuelPerWeek;
        costPerWeekTotal += i.system.costPerWeek;
        capacityTotal += i.system.capacity;
        members.push(i);
      }
      else if (i.type === 'caravanItem') {
        capacityUsed += i.system.size * i.system.quantity;
        items.push(i);
      }
    }

    context.members = members;
    context.items = items;
    context.supplyPerWeekTotal = supplyPerWeekTotal;
    context.fuelPerWeekTotal = fuelPerWeekTotal;
    context.costPerWeekTotal = costPerWeekTotal;
    context.capacityTotal = capacityTotal;
    context.capacityLeft = capacityTotal - capacityUsed;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    html.find('.ddRoll').click(this._ddRoll.bind(this));

    // Update Inventory Item
    html.find('.item-quickslot-edit').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = duplicate(this.actor.getEmbeddedDocument("Item", li.dataset.itemId))

      item.system.quickslot = !item.system.quickslot;
      this.actor.updateEmbeddedDocuments('Item', [item]);
    });

    // Update Spell
    html.find('.item-memorized-edit').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = duplicate(this.actor.getEmbeddedDocument("Item", li.dataset.itemId))

      item.system.equipped = !item.system.equipped;
      this.actor.updateEmbeddedDocuments('Item', [item]);
    });

    html.find('.item-remove-quantity').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = duplicate(this.actor.getEmbeddedDocument("Item", li.dataset.itemId))

      item.system.quantity--;
      if (item.system.quantity < 0) {
        item.system.quantity = 0;
      }
      this.actor.updateEmbeddedDocuments('Item', [item]);
    });

    html.find('.item-add-quantity').click(ev => {
      const li = ev.currentTarget.closest(".item");
      const item = duplicate(this.actor.getEmbeddedDocument("Item", li.dataset.itemId))

      item.system.quantity++;
      if (item.type != 'caravanItem') {
        if (item.system.quantity > item.system.maxQuantity) {
          item.system.quantity = item.system.maxQuantity;
        }
      }
      this.actor.updateEmbeddedDocuments('Item', [item]);
    });

    html.find('a.hitpointroll').click(ev => {
      this.actor.rollHitDice();
    });

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
          item.roll();
        }
      } else if (dataset.rollType == 'ability') {
        let key = dataset.rollAbility;
        this.actor.rollAbility(key)
      } else if (dataset.rollType == 'primarystat') {
        let key = dataset.rollStat;
        this.actor.rollStat(key);
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  _ddRoll(event) {
    event.preventDefault();
    this.actor.rollDD();
  }
}
