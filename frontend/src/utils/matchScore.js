export function calculateMatchScore(jobTags = [], userSkills = []) {
  if (!userSkills.length || !jobTags.length) return null;

  const normalizedUser = userSkills.map((s) => String(s).toLowerCase().trim());
  const normalizedTags = jobTags.map((t) => String(t).toLowerCase().trim());

  const matches = normalizedTags.filter((tag) =>
    normalizedUser.some((skill) => skill.includes(tag) || tag.includes(skill))
  );

  return Math.round((matches.length / normalizedTags.length) * 100);
}

export function getJobTagsForMatch(job) {
  if (!job) return [];
  if (Array.isArray(job?.tags) && job.tags.length) return job.tags.map(String);
  if (Array.isArray(job?.skills) && job.skills.length) return job.skills.map(String);
  const tags = [];
  if (job?.category?.label) tags.push(job.category.label);
  return tags;
}
