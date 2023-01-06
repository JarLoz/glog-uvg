/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/glog-uvg/templates/actor/parts/actor-features.html",
    "systems/glog-uvg/templates/actor/parts/actor-items.html",
    "systems/glog-uvg/templates/actor/parts/actor-item-row.html",
    "systems/glog-uvg/templates/actor/parts/actor-spells.html",
    "systems/glog-uvg/templates/actor/parts/actor-effects.html",
    "systems/glog-uvg/templates/actor/parts/actor-npc-items.html",
    "systems/glog-uvg/templates/actor/parts/actor-npc-item-row.html",
  ]);
};
