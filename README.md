# Playground for GitHub Actions

## Branch protection rules

`main` branch is protected by:
- **Require a pull request before merging**  
  When enabled, all commits must be made to a non-protected branch and submitted via a pull request before they can be 
  merged into a branch that matches this rule.

  - **Require approvals: 1**  
    When enabled, pull requests targeting a matching branch require a number of approvals and no changes requested 
    before they can be merged.


- **Require status checks to pass before merging**
  When enabled, commits must first be pushed to another branch, then merged or pushed directly to a branch that matches this rule after status checks have passed.

  - **Status checks that are required:**  
    - `Check if recent push is only a rebase on the base branch` (GitHub Actions)


- **Require conversation resolution before merging**  
  When enabled, all conversations on code must be resolved before a pull request can be merged into a branch that matches this rule.


- **Require linear history**  
  Prevent merge commits from being pushed to matching branches.


- **Allow force pushes** - **!!! Only enabled for easier Pull-Request CI rebase testing !!!**  
  Permit force pushes for all users with push access.  

  - **Specify who can force push:**  
    Only these people, teams, or apps are allowed to force push.  
    `bojanpotocnik`   

## Tests

1. [Test not-dismissing reviews for pure PR base-branch rebases #4](https://github.com/bojanpotocnik/github-workflow-playground/pull/4)
shows basic functionality - PR review is not dismissed if latest push was a pure rebase.\
It is dismissed on any change to any commit involved in the PR, even changes otherwise not visible in the GitHub
comparison view (commit messages, authors). :heavy_check_mark:

2. [Huge pull-request test #5](https://github.com/bojanpotocnik/github-workflow-playground/pull/5)
tested what happens when there are too many changes for comparison.\
The most important thing is that reviews are kept only when we are sure that the latest push was
a pure rebase - if anything goes wrong, reviews must be dismissed (safety fallback).\
If patch is too large, GitHub API returns _The patch could not be processed because too many files changed_ and
reviews are dismissed. :heavy_check_mark:

3. [Increasingly large PR test #6](https://github.com/bojanpotocnik/github-workflow-playground/pull/6)
tried to crash the JS script by trying to allocate too much memory - by producing larger and larger
patches, which are still smaller than ones in the previous point and therefore returned by the GitHub API.\
It turns out there are 2 cases:
   - Either patches are retrieved and compared successfully, or  
   - API request returns _Server Error_.

   _Server Error_ could also mean that the internal memory allocation for the API result failed,
but in any case, this is done as a part of the request and therefore caught as an error,
resulting in dismissed reviews. :heavy_check_mark:

4. [New PR after Action is set to required #7](https://github.com/bojanpotocnik/github-workflow-playground/pull/7)
tested what happens if action is set as required status check, meaning it must always execute.\
This was handled by adding more triggers, so the actual checks are ignored in reported as successful
for anything else than push to the branch. :heavy_check_mark:
