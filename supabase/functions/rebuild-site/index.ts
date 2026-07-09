// Supabase Edge Function: rebuild-site
// Fires GitHub `repository_dispatch: rebuild-catalog` so a product added in the
// dashboard gets its static page + sitemap entry within ~2-3 min instead of
// waiting for the 6h cron.
//
// Deploy (one-time, from repo root):
//   supabase functions deploy rebuild-site --project-ref kqzvozgvhcefthbgvtrf
//   supabase secrets set GITHUB_PAT=<token> --project-ref kqzvozgvhcefthbgvtrf
//
// The token needs permission to POST /repos/st1score/myavto-landing/dispatches:
// classic PAT with `repo` scope, or fine-grained PAT with Contents read+write
// on that single repo. Quick source: `gh auth token` (the gh CLI keyring token
// already has repo scope) — but a dedicated fine-grained PAT survives gh
// re-logins, so prefer creating one at github.com/settings/personal-access-tokens.
//
// Auth: verify_jwt is ON (default) — only an authenticated dashboard session
// can invoke. Single-seller model: any valid session = the owner.

const GITHUB_REPO = 'st1score/myavto-landing';

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const pat = Deno.env.get('GITHUB_PAT');
  if (!pat) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT secret is not set' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const gh = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'myavto-rebuild-fn',
    },
    body: JSON.stringify({ event_type: 'rebuild-catalog' }),
  });

  if (gh.status !== 204) {
    const detail = await gh.text();
    return new Response(JSON.stringify({ error: `GitHub ${gh.status}`, detail }), {
      status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
