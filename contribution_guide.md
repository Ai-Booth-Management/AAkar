## Project Contribution Guide
Welcome to the project! To keep our codebase stable and moving fast with 20 team members, we use a Fork-and-Pull workflow.

* Maintainers (4 members): Review, give feedback, and merge code.
* Contributors (16 members): Fork the repository, create feature branches, and submit Pull Requests (PRs).

------------------------------
## Part 1: Initial Setup (Do This Once)## 1. Fork the Repository

   1. Navigate to the main project repository on GitHub.
   2. Click the Fork button in the top-right corner.
   3. Select your personal GitHub account as the destination.

## 2. Clone Your Fork
Open your terminal and clone your personal fork (replace YOUR-USERNAME with your actual GitHub username):

git clone https://github.com
cd repository-name

## 3. Link to the Original Repository
To keep your fork updated with the latest changes from the maintainers, link it to the original repository as an upstream remote:

git remote add upstream https://github.com

Verify it worked by running git remote -v. You should see both origin (your fork) and upstream (the main project).
------------------------------
## Part 2: Daily Working Workflow
Always follow these steps for every new feature or bug fix to prevent code conflicts.
## Step 1: Update Your Main Branch
Before writing any code, pull the latest official updates from the maintainers:

git checkout main
git pull upstream main

## Step 2: Create a Feature Branch
Never write code directly on the main branch. Create a descriptive branch for your task:

git checkout -b feature/your-feature-name# Example: git checkout -b feature/login-page

## Step 3: Write Code and Commit
Keep your commits small, focused, and write clear commit messages:

git add .
git commit -m "Add email validation to login page"

## Step 4: Push to Your Fork
Push your feature branch to your personal GitHub repository:

git push origin feature/your-feature-name

## Step 5: Open a Pull Request (PR)

   1. Go to the original project repository on GitHub.
   2. You will see a yellow banner saying "Compare & pull request". Click it.
   3. Describe what your code does and link any relevant issue numbers.
   4. Click Create pull request.

------------------------------
## Part 3: How to Handle Merge Conflicts
If another contributor merges code that clashes with yours, GitHub will block your PR. It is the contributor's responsibility to fix this. Follow these steps in your terminal:
## 1. Get the Latest Main Code

git checkout main
git pull upstream main

## 2. Merge Main into Your Feature Branch

git checkout feature/your-feature-name
git merge main

## 3. Fix the Conflicts manually
Your code editor (like VS Code) will highlight the clashing lines with markers:

<<<<<<< HEAD
Your new feature code (Current Change)
=======
The updated code currently on main (Incoming Change)
>>>>>>> main


* Edit the file to delete the markers (<<<<<<<, =======, >>>>>>>).
* Clean up the code so both features work correctly together.
* Save the file.

## 4. Commit and Push the Fix

git add .
git commit -m "Resolve merge conflicts with main"
git push origin feature/your-feature-name

Your Pull Request on GitHub will automatically update, turn green, and allow the maintainers to merge it!
------------------------------
## Part 4: Golden Rules for Success

   1. One Task Per Branch: Do not mix two different features into one branch.
   2. Keep PRs Small: Small PRs are reviewed and merged much faster by maintainers.
   3. Sync Daily: Run git pull upstream main every morning to avoid massive merge conflicts later.

------------------------------


