# Isocity

## Purpose
Peter wants this city to be a GitHub workspace: buildings have distinct jobs, with quick access to his repositories, starred projects, and developer tools. This direction was explicitly confirmed in chat. The city remains editable through Build city mode.

## Platform and stack
Browser-based static HTML, CSS, JavaScript, and Canvas 2D. Preserve the existing renderer and city simulation. No application backend or GitHub OAuth client is configured.

## Workflows
Browse repositories and starred projects, open project-specific tools, pin frequently used projects, save personal links, and navigate through building departments or the searchable directory.

## Data and access
Public catalog data comes from GitHub with pagination. Private repositories remain accessible through GitHub's authenticated pages or manually saved local shortcuts. Never commit private catalog metadata, credentials, or personal shortcut data. Public data caching, pins, and shortcuts use local browser storage. These are implementation constraints, not claims of GitHub sign-in support.

## Success
A building click opens the relevant department without modifying the city; every department has usable links; large catalogs do not create unbounded DOM lists or per-frame network work; failures leave direct navigation available.
