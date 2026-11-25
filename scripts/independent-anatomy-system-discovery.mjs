// Conservative name-based discovery, not anatomical classification approval.
const tidy=n=>String(n).toLowerCase().trim().replace(/\s+/g,' ');
const rules={
 skeletal:[/\b(?:femur|tibia|fibula|patella|humerus|radius|ulna|clavicle|scapula|sternum|sacrum|coccyx|mandible|maxilla)(?: of (?:left|right) (?:upper|lower) limb)?$/,/^(?:(?:left|right) )?(?:[a-z]+ )?(?:carpal|metacarpal|tarsal|metatarsal) bone(?: of (?:left|right) (?:hand|foot))?$/,/^(?:(?:[a-z]+|\d+) )?(?:cervical|thoracic|lumbar) vertebra$/],
 muscular:[/\bmuscle(?: of (?:left|right) [a-z ]+)?$/],
 joints:[/\b(?:joint|articulation|ligament)(?: of [a-z ]+)?$/],
 arterial:[/\b(?:artery|arteriole)(?: of [a-z ]+)?$/],
 venous:[/\b(?:vein|venule)(?: of [a-z ]+)?$/],
 heart:[/^(?:heart|(?:left|right) (?:atrium|ventricle)(?: of heart)?|interventricular septum|(?:mitral|tricuspid|aortic|pulmonary) valve)$/],
 nervous:[/\b(?:nerve|nerve root|ganglion)(?: of [a-z ]+)?$/,/^(?:brain|spinal cord|cerebrum|cerebellum|pons|medulla oblongata|midbrain)$/],
 lymphatic:[/\b(?:lymph node|lymphatic vessel|lymphatic trunk)(?: of [a-z ]+)?$/,/^(?:thoracic duct|right lymphatic duct|cisterna chyli|spleen|thymus)$/],
 respiratory:[/^(?:(?:left|right) )?(?:lung|main bronchus|trachea|larynx)$/,/^(?:superior|middle|inferior) lobe of (?:left|right) lung$/],
 digestive:[/^(?:esophagus|oesophagus|stomach|duodenum|jejunum|ileum|cecum|caecum|appendix|(?:ascending|transverse|descending|sigmoid) colon|rectum|liver|gallbladder|pancreas)$/],
 urinary:[/^(?:(?:left|right) )?(?:kidney|ureter|renal pelvis)$|^(?:urinary bladder|urethra)$/],
 reproductive:[/^(?:(?:left|right) )?(?:ovary|testis|uterine tube|vas deferens|epididymis)$|^(?:uterus|vagina|prostate|penis|scrotum)$/],
 endocrine:[/^(?:(?:left|right) )?(?:adrenal gland|suprarenal gland|parathyroid gland)$|^(?:thyroid gland|pituitary gland|hypophysis|pineal gland)$/]
};
export function discoverSystem(name){
 const n=tidy(name);
 // Multiple anatomical tissue terms can denote a structure's relation, rather than its type.
 // Exclude names with compound or ambiguous tissue descriptions from automatic suggestions.
 if(/[;/+]/.test(n)||/\b(?:and|or|part of|surface of|branch of|wall of|opening of|fossa of|foramen of|impression of|groove of)\b/.test(n))return null;
 const hits=Object.entries(rules).filter(([,r])=>r.some(p=>p.test(n))).map(([g])=>g);
 // Guard related tissue descriptions such as an artery's nerve or a ligament of an organ.
 const tissue=[
 ['muscular',/\bmuscle\b/],['joints',/\b(?:joint|ligament|articulation)\b/],['arterial',/\b(?:artery|arteriole)\b/],
 ['venous',/\b(?:vein|venule)\b/],['nervous',/\b(?:nerve|ganglion)\b/],['lymphatic',/\b(?:lymphatic|lymph node)\b/]
 ].filter(([,p])=>p.test(n)).map(([g])=>g);
 if(hits.length!==1||tissue.some(g=>g!==hits[0]))return null;
 return {group:hits[0],method:'publisher-name-system-suggestion',clinicalValidation:false};
}
