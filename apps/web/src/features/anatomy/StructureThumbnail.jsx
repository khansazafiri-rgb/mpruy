import {Box} from 'lucide-react';
import {useState} from 'react';
import {ANATOMY_VIEWER_PATH} from './hostProtocol.mjs';
import {previewPath} from './registry.mjs';
export default function StructureThumbnail({path,name,className='',eager=false,privateReview=false}) {
 const [failed,setFailed]=useState(null);
 const safe=privateReview&&typeof path==='string'&&/^private-thumbnails\/(?:bp|sel)-[a-f0-9]{24}\.png$/.test(path)?path:previewPath(path);
 return <div className={'anatomy-mesh-thumbnail '+className}>{safe&&failed!==safe?<img src={ANATOMY_VIEWER_PATH+safe} alt={name+' · rendered from the 3D atlas'} loading={eager?'eager':'lazy'} decoding="async" onError={()=>setFailed(safe)}/>:<Box size={28} aria-label="Preview unavailable"/>}</div>;
}
