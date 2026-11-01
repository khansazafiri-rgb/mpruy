export function apiFixture(path){
 if(path==='/api/medcoel/public-settings')return {showMascots:false};
 if(path==='/api/medcoel/announcements/active')return {items:[]};
 if(path==='/api/medcoel/lab/overview')return {continue:null};
 if(path==='/api/medcoel/lab/catalog')return {items:[],modules:[]};
 if(path==='/api/medcoel/lab/objects'||path==='/api/medcoel/lab/pathways')return {items:[],hasMore:false,totalItems:0,page:1};
 return null;
}
