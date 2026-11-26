// SHOP-INTEGRATION: read-only presentation adapter; never grants, charges, persists or authorizes a transaction.
// Route values map to existing delegated handlers; the writer must revalidate in its transaction.
export function marketOffers(items, readLeft, readBalance) {
  return items.map(({key, kind, id, qty, cur, price, lim}) => {
    const left = readLeft({key,kind,id,qty,cur,price,lim});
    return {key, route:'buy',kind,id:id??null,qty,cur,price,limit:lim,left,balance:readBalance(cur)};
  });
}

export function jihadOffers(items, balance) {
  return items.map(({key,n,d,ico,rar,price,lim,sold}) => ({
    key,route:'cqjbuy',kind:ico,id:key,qty:key==='med3'?3:1,cur:'jt',price,
    limit:lim??0,left:sold?0:lim?1:-1,balance,n,d,rar:rar??null
  }));
}

export function catalogPage(offers, {filter='all',page=0,selected=null}={}) {
  const rows=offers.filter(o=>filter==='all'||(filter==='shards'?o.kind==='sh':filter==='resources'?o.kind!=='sh':true));
  const pages=Math.max(1,Math.ceil(rows.length/6));
  const index=Math.max(0,Math.min(pages-1,Number.isInteger(page)?page:0));
  const visible=rows.slice(index*6,index*6+6);
  return {count:rows.length,pages,index,visible,selected:visible.find(o=>o.key===selected)?.key??visible[0]?.key??null};
}

export function offerStatus(o) {
  if (!o || !Number.isSafeInteger(o.price)||o.price<0||!Number.isSafeInteger(o.qty)||o.qty<1||!Number.isSafeInteger(o.balance)||!Number.isSafeInteger(o.left)||o.left<-1) return 'unavailable';
  if(o.left===0)return 'sold';
  return o.balance<o.price?'funds':'ready';
}

export function captureIntent(offer, epoch) {
  if(typeof epoch!=='string'||!epoch||offerStatus(offer)!=='ready'||!['buy','cqjbuy','fbuy'].includes(offer.route))return null;
  const {key,route,kind,id,qty,cur,price}=offer;
  return Object.freeze({epoch,key,route,kind,id:id??null,qty,cur,price});
}

export function revalidateIntent(intent, offers, epoch) {
  if(!intent||intent.epoch!==epoch)return null;
  const fresh=offers.find(o=>o.key===intent.key&&o.route===intent.route);
  const next=captureIntent(fresh,epoch);
  return next&&Object.keys(next).every(k=>next[k]===intent[k])?fresh:null;
}
