/*
 * Studio runtime configuration. Studio is a static, client-only app: every
 * write goes to the GitHub contents API with the logged-in user's token, so
 * repo collaborator permissions are the only (and sufficient) write gate.
 */
export const STUDIO = {
  owner: "ryanw0608",
  repo: "HomePage",
  branch: "master",
  // Decap/Sveltia-protocol OAuth broker (docs/admin-setup.md Part A).
  authWorker: "https://cms-auth.wyz162536.workers.dev",
  collections: ["course-notes", "paper-reading"] as const,
  contentRoot: "src/content",
  tokenKey: "studio:gh-token",
  draftKeyPrefix: "studio:draft:"
};

export type StudioCollection = (typeof STUDIO.collections)[number];

export const REPO_SLUG = `${STUDIO.owner}/${STUDIO.repo}`;
