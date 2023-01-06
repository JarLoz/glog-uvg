
export function evaluateOpposed(stat, bonus, opposed) {
  let bonusval = parseInt(bonus);
  let opposedval = parseInt(opposed);
  let total = stat + 10;
  if (isNaN(bonusval)) {
    bonusval = 0;
  }
  if (isNaN(opposedval)) {
    opposedval = 0;
  }
  total = total + bonusval - opposedval;
  let formula = "";
  if (bonusval != 0) {
    formula += `(${stat} + ${bonusval})`;
  } else {
    formula += `${stat}`;
  }
  formula += ` + (10 - ${opposedval})`;
  return {total: total, formula: formula};
}

export async function postNPCTokenCreate(token) {
  if (!token.actor.system.hd.autoroll) {
    return;
  }
  const hitdice = String(token.actor.system.hd.value);
  const hitdicerest = String(token.actor.system.hd.die);
  let formula = hitdice + hitdicerest

  const roll = new Roll(formula).roll({ async: false });
  let hp = roll.total;
  hp = Math.max(hp, 1);

  console.log("_postNPCTokenCreate:createToken:hp", { hp });
  const actorUpdates = {
      "system.hp.value": hp,
      "system.hp.max": hp,
  };
  const _timeout2 = setTimeout(async () => await token.actor.update(actorUpdates), 300);
}


