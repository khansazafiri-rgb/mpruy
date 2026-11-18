// One anatomy design at every scale. Front view: patient's left is screen-right.
export const STOMACH='M-60 -160C-12 -145 0 -240 100 -235C250 -240 288 -35 232 142C188 288 44 316 -96 224C-148 190 -166 130 -204 124L-250 120L-252 64L-189 66C-135 65 -125 132 -76 122C-18 112 -17 -15 -55 -35C-96 -58 -111 -122 -60 -160Z';
export function stomachSvg(t,{uid='st',wound=0,food=0}={}){
 const p=1+.009*Math.sin(t*2.4);
 let s=`<g transform="scale(${p} 1)"><path d="M-61 -340V-159" fill="none" stroke="#F4A29B" stroke-width="70"/><path d="M-61 -340V-159" fill="none" stroke="#FFF0DC" stroke-width="35"/><path d="M-241 94Q-315 92-308 184Q-300 219-271 224" fill="none" stroke="#F4A29B" stroke-width="70" stroke-linecap="round"/><path d="M-241 94Q-315 92-308 184Q-300 219-271 224" fill="none" stroke="#FFF0DC" stroke-width="35" stroke-linecap="round"/><path d="${STOMACH}" fill="#F4A29B" stroke="#C96F68" stroke-width="4"/><g transform="scale(.86)"><path d="${STOMACH}" fill="#FFF0DC" stroke="#9DE0BD" stroke-width="17"/></g>`;
 s+='<path d="M-61 -180L-51 -112M-270 94H-178" fill="none" stroke="#FFF0DC" stroke-width="29" stroke-linecap="round"/>';
 if(food>0)for(let i=0;i<4;i++)s+=`<ellipse cx="${-20+i*48}" cy="${80+i%2*35}" rx="${20*food}" ry="${13*food}" fill="#E6BD75"/>`;
 if(wound>0)s+=`<g opacity="${wound}"><path d="M196 10Q163 38 191 74Q230 76 224 38Z" fill="#B95C55"/><path d="M194 24Q181 46 203 61" fill="none" stroke="#FFDBA9" stroke-width="8" stroke-linecap="round"/></g>`;
 return s+'</g>';
}
export function bacteriumSvg(t,{color='#8E7CE8'}={}){
 return `<g transform="rotate(${Math.sin(t*2)*5})"><path d="M-70 0C-68-47 2-49 8-7S74 45 77 0" fill="none" stroke="${color}" stroke-width="35" stroke-linecap="round"/><path d="M-70-1C-60-25-20-29-13-1" fill="none" stroke="#B3A7F3" stroke-width="8" stroke-linecap="round"/>`+[0,1,2].map(i=>`<path d="M75 ${i*8-8}Q${115+Math.sin(t*5+i)*12} ${-40+i*45} ${151+Math.sin(t*4+i)*7} ${-10+i*24}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`).join('')+'</g>';
}
