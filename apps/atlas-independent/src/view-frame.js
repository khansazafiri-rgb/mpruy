// Presentation only: no model matrices, vertices or source receipts changed.
// DBCLS official coordinate diagram:
// https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/coordinate_system.png
// Native BP3D: +Z superior, -Y anterior, +X anatomical left.
export function viewFrame(bp3d=false){
 return bp3d?{
  up:[0,0,1],front:[0,-1,0],back:[0,1,0],side:[-1,0,0],right:[1,0,0],top:[0,-.0001,1],
  key:[2,-4,3],fill:[-3,3,2],
  labels:{front:['−Y','Anterior'],back:['+Y','Posterior'],side:['−X','Sisi kanan tubuh'],right:['+X','Sisi kiri tubuh'],top:['+Z','Superior']}
 }:{
  up:[0,1,0],front:[0,0,1],back:[0,0,-1],side:[-1,0,0],right:[1,0,0],top:[0,1,.0001],
  key:[2,3,4],fill:[-2,2,-3],
  labels:{front:['+Z','Sumbu sumber'],back:['−Z','Sumbu sumber'],side:['−X','Sumbu sumber'],right:['+X','Sumbu sumber'],top:['+Y','Sumbu sumber']}
 };
}
