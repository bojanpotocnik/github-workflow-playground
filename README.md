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

- **Require conversation resolution before merging**  
  When enabled, all conversations on code must be resolved before a pull request can be merged into a branch that matches this rule.

- **Require linear history**  
  Prevent merge commits from being pushed to matching branches.


- **Allow force pushes** - **!!! Only enabled for easier Pull-Request CI rebase testing !!!**  
  Permit force pushes for all users with push access.  

  - **Specify who can force push:**  
    Only these people, teams, or apps are allowed to force push.  
    `bojanpotocnik`   
