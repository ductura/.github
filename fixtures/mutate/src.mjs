// DAN-1090 fixture: two mutants, neither equivalent. a < b in a comment is never mutated.
export const canVote = (age, citizen) => citizen && age >= 18;
export const label = "citizen && age >= 18";
