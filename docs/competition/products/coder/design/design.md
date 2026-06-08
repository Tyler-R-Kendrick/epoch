---
product: Coder
slug: coder
design_schema: 1
sources:
  - https://coder.com/docs/about/screenshots
  - https://coder.com/docs/admin/templates
  - https://coder.com/docs
---

# Coder Design

## Look And Feel

Coder's public screenshots show an enterprise operations console: login, templates, workspaces, usage insights, deployment controls, audit views, and health monitoring. The product is quiet, table-driven, and infrastructure-forward. It uses template pages, workspace lists, admin panels, and IDE launch actions rather than a consumer-style AI chat surface.

## Design References

- Screenshots documentation: login, templates, workspaces, administration, audits, and deployment health.
- Template docs: starter templates, Terraform-backed infrastructure definitions, template extension, policies, and CI/CD management.
- Open-source repository: exposes Coder's product language, CLI, templates, and deployment model.

## Differentiators

- Terraform templates are treated as a visible product primitive, not a hidden provisioning layer.
- The UI makes admin and operator needs as prominent as developer workspace launch.
- The product explicitly pairs human developer environments with AI coding agents and governance.

## What Works Well

- Platform teams can understand the deployment model quickly because screenshots map to their actual tasks: create templates, manage workspaces, inspect audit logs, and monitor health.
- Developers keep choice of IDE while the organization keeps control of infrastructure and schedules.
- Cost and security controls are productized through autostop, scheduling, template parameters, and policy surfaces.

## UX Breakdowns

- Terraform-centered templates are powerful but can be intimidating for teams without infrastructure-as-code maturity.
- The admin-heavy interface may feel less delightful to individual contributors who only want a fast workspace.
- Because Coder embraces customer-owned infrastructure, first success depends on deployment and template quality outside the product UI.
