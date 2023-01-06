
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
  const _timeout2 = setTimeout(async () => await token.actor.rollHitDice(), 300);
}


