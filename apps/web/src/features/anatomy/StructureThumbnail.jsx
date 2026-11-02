import {Box} from 'lucide-react';
import {ANATOMY_VIEWER_PATH} from './hostProtocol.mjs';
import {previewPath} from './registry.mjs';
export default function StructureThumbnail({path,name,className='',eager=false}) {
 const safe=previewPath(path);
 return <div className={'anatomy-mesh-thumbnail '+className}>{safe?<img src={ANATOMY_VIEWER_PATH+safe} alt={name+' · rendered from the 3D atlas'} loading={eager?'eager':'lazy'} decoding="async"/>:<Box size={28} aria-label="Preview unavailable"/>}</div>;
}
