(()=>{
'use strict';
/* Date entry and conversion are now owned by os-nepali-calendar-v1.js.
   This compatibility shim intentionally does not wrap inputs or register observers. */
if(window.RachnaDateCheck && !window.RachnaBS){
  window.RachnaBS={
    bsToAd:window.RachnaDateCheck.bsToAd,
    adToBs:window.RachnaDateCheck.adToBs,
    todayBs:window.RachnaDateCheck.todayBs,
    months:['Baisakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra']
  };
}
})();
