export function lessonChapters(module) {
  return (module.chapters || []).map((chapter) => ({ ...chapter, sections: chapter.sections.map((section) => ({
    ...section, blocks: section.blocks.filter((block) => block.type !== 'practice'),
  })).filter((section) => section.blocks.length) })).filter((chapter) => chapter.sections.length);
}

export function practiceBanks(module) {
  const found = new Map();
  for (const chapter of module.chapters || []) for (const section of chapter.sections) for (const block of section.blocks) {
    if (block.type !== 'practice' || found.has(block.bank)) continue;
    const questions = module.questionBanks?.[block.bank] || [];
    found.set(block.bank, { key: block.bank, title: block.title || section.title, questions });
  }
  return [...found.values()];
}
