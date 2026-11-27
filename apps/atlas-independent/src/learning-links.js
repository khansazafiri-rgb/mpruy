// Explicit educational links; source classification remains unchanged.
export const crossSystemLinks=Object.freeze({'FMA55099':['respiratory','skeletal'],'FMA9615':['respiratory','skeletal'],'FMA55109':['respiratory','skeletal'],'FMA4706':['heart','venous']});
export function permittedLearningGroup(fma,target,source){const pair=crossSystemLinks[fma];return target===source||!!pair&&pair[0]===target&&pair[1]===source;}
export const lungCheckpointAliases=Object.freeze({
 'apical segment of right lung':['FMA7338','right apical bronchopulmonary segment'],
 'posterior segment of right lung':['FMA7339','right posterior bronchopulmonary segment'],
 'anterior segment of right lung':['FMA7359','right anterior bronchopulmonary segment'],
 'lateral segment of right lung':['FMA7361','lateral bronchopulmonary segment'],
 'medial segment of right lung':['FMA7360','medial bronchopulmonary segment'],
 'superior segment of right lower lobe':['FMA7366','right superior bronchopulmonary segment'],
 'apical posterior segment of left lung':['FMA7372','apicoposterior bronchopulmonary segment'],
 'anterior segment of left lung':['FMA7373','left anterior bronchopulmonary segment'],
 'superior lingular segment':['FMA7374','superior lingular bronchopulmonary segment'],
 'inferior lingular segment':['FMA7375','inferior lingular bronchopulmonary segment']
});

// Exact mirror-tree identity candidates, not clinical synonym approval.
// BP3D 4.0 lookup must independently verify FMA, name and all member OBJ files.
export const muscleCheckpointAliases=Object.freeze({
  "left supraspinatus muscle": [
    "FMA32545",
    "left supraspinatus"
  ],
  "right supraspinatus muscle": [
    "FMA32544",
    "right supraspinatus"
  ],
  "left subscapularis muscle": [
    "FMA13415",
    "left subscapularis"
  ],
  "right subscapularis muscle": [
    "FMA13414",
    "right subscapularis"
  ],
  "left teres minor muscle": [
    "FMA32554",
    "left teres minor"
  ],
  "right teres minor muscle": [
    "FMA32553",
    "right teres minor"
  ],
  "left gluteus maximus muscle": [
    "FMA22329",
    "left gluteus maximus"
  ],
  "right gluteus maximus muscle": [
    "FMA22328",
    "right gluteus maximus"
  ],
  "left gluteus medius muscle": [
    "FMA22331",
    "left gluteus medius"
  ],
  "right gluteus medius muscle": [
    "FMA22330",
    "right gluteus medius"
  ],
  "left gluteus minimus muscle": [
    "FMA22333",
    "left gluteus minimus"
  ],
  "right gluteus minimus muscle": [
    "FMA22332",
    "right gluteus minimus"
  ],
  "left rectus femoris muscle": [
    "FMA38929",
    "left rectus femoris"
  ],
  "right rectus femoris muscle": [
    "FMA38928",
    "right rectus femoris"
  ],
  "left vastus lateralis muscle": [
    "FMA38931",
    "left vastus lateralis"
  ],
  "right vastus lateralis muscle": [
    "FMA38930",
    "right vastus lateralis"
  ],
  "left vastus medialis muscle": [
    "FMA38933",
    "left vastus medialis"
  ],
  "right vastus medialis muscle": [
    "FMA38932",
    "right vastus medialis"
  ],
  "left vastus intermedius muscle": [
    "FMA38935",
    "left vastus intermedius"
  ],
  "right vastus intermedius muscle": [
    "FMA38934",
    "right vastus intermedius"
  ],
  "left tibialis anterior muscle": [
    "FMA22545",
    "left tibialis anterior"
  ],
  "right tibialis anterior muscle": [
    "FMA22544",
    "right tibialis anterior"
  ],
  "left soleus muscle": [
    "FMA22559",
    "left soleus"
  ],
  "right soleus muscle": [
    "FMA22558",
    "right soleus"
  ]
});
