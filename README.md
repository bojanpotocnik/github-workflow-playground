# Playground for GitHub Actions

## Branch protection rules

`main` branch is protected by:
- **Require a pull request before merging**

  When enabled, all commits must be made to a non-protected branch and submitted via a pull request before they can be 
  merged into a branch that matches this rule.

  - **Require approvals: 1**
    
    When enabled, pull requests targeting a matching branch require a number of approvals and no changes requested 
    before they can be merged.

  - **Dismiss stale pull request approvals when new commits are pushed**

    New reviewable commits pushed to a matching branch will dismiss pull request review approvals.

- **Require conversation resolution before merging**
  
  When enabled, all conversations on code must be resolved before a pull request can be merged into a branch that matches this rule.

- **Require linear history**

  Prevent merge commits from being pushed to matching branches.