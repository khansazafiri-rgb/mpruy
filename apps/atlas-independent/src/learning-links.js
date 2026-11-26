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
