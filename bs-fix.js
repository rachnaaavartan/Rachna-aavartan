(() => {
  const NP = window.NepaliDate;
  if (!NP) return;
  class RachnaDateConverter {
    constructor(value) { this.value = value; }
    toAd() {
      const match = String(this.value ?? '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) throw new Error('Invalid BS date');
      const year = Number(match[1]), month = Number(match[2]), date = Number(match[3]);
      if (month < 1 || month > 12 || date < 1 || date > 32) throw new Error('Invalid BS date');
      const d = new NP(year, month - 1, date);
      if (d.getYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== date) throw new Error('Invalid BS date');
      const ad = d.getAD();
      return { year: ad.year, month: ad.month, date: ad.date };
    }
    toBs() {
      const value = String(this.value ?? '').trim();
      const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) throw new Error('Invalid AD date');
      const year = Number(match[1]), month = Number(match[2]), date = Number(match[3]);
      if (month < 1 || month > 12 || date < 1 || date > 31) throw new Error('Invalid AD date');
      const d = NP.fromAD ? NP.fromAD(new Date(Date.UTC(year, month - 1, date))) : new NP(new Date(Date.UTC(year, month - 1, date)));
      const bs = d.getBS();
      return { year: bs.year, month: bs.month, date: bs.date };
    }
  }
  window.DateConverter = RachnaDateConverter;
})();
