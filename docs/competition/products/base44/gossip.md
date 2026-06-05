# Base44 Gossip

## Public Sentiment

Base44 sentiment is polarized. Users praise rapid prototyping and the feeling of making real apps without traditional coding, but public complaints often describe production instability, credit exhaustion, support delays, backend opacity, and platform updates that break existing apps.

Sources:

- [Reddit: Is Base44 a good AI App builder?](https://www.reddit.com/r/Base44/comments/1o1yo2e/is_base44_a_good_ai_app_builder/)
- [Reddit: Base44 is breaking apps in production](https://www.reddit.com/r/Base44/comments/1q5plx3/base44_is_breaking_apps_in_production_existing/)
- [Reddit: Serious Warning About Base44](https://www.reddit.com/r/Base44/comments/1rtpyyl/serious_warning_about_base44_dont_use_it_for_real/)
- [Reddit: deployment stuck on old bundle](https://www.reddit.com/r/Base44/comments/1tnip39/base44_deployment_stuck_on_old_bundle_github/)
- [Reddit: OAuth redirect issue](https://www.reddit.com/r/Base44/comments/1sui0wp/google_oauth_redirect_going_to_appbase44com/)
- [Base44 developer changelog](https://docs.base44.com/developers/changelog)

## What People Like

- Fast prototype creation from a single idea.
- Built-in backend, auth, hosting, and integrations.
- Ability to create business tools without first learning the full web stack.
- Newer SDK, CLI, and connector docs give advanced users more control than pure no-code tools.

## Common Complaints

- AI edits can introduce regressions, remove unrelated behavior, or force users to spend more credits repairing the damage.
- Production users report outages, silent registration failures, Stripe or connector breakage, and removed or altered features.
- Some users describe the backend as too black-box even when GitHub sync exists.
- Support responsiveness and billing/upgrade confusion appear repeatedly in community posts.
- Mobile wrapping, OAuth redirects, and GitHub deployment sync are recurring friction points.

## Bug And Risk Themes

- Platform-owned runtime changes can affect live apps without a repository-visible review trail.
- Integration credits create operational cost surprises after deployment.
- GitHub sync can be insufficient if the deployed platform state diverges from the repo state.
- Trust issues intensify when generated apps handle users, payments, API keys, or app-store distribution.

## Epoch Opportunity

Epoch can differentiate by treating generated-app changes as signed, reviewable history with explicit runtime ownership. The product should make rollback, connector provenance, and live-state evidence visible before the first production user arrives.
