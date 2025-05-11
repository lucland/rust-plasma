# AI Assistant Prompts for Plasma Furnace Simulator

This document contains detailed prompts for an AI assistant to complete tasks outlined in the `TODO.md` roadmap. Each prompt is designed to provide sufficient context, guide the AI with clear instructions, and ensure adherence to software development best practices relevant to the Plasma Furnace Simulator project.

## Pre-Sprint: Foundation & Setup

### Task: Initialize Git repository on a chosen platform (e.g., GitHub, GitLab).
(Corresponds to `TODO.md` Pre-Sprint Task 1)

**Prompt Text:**
```
Assistant,

We are initiating the "Plasma Furnace Simulator" project. Your first task is to initialize a Git repository.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Goal:** Establish version control for all project assets.
*   **Platform:** While the task mentions "chosen platform (e.g., GitHub, GitLab)," for now, focus on local initialization. We will handle remote setup later.
*   **Directory:** The project root is `/Users/lucasvalente/rust-plasma`. Ensure the `.git` directory is created here.

**Instructions:**
1.  Navigate to the project root directory: `/Users/lucasvalente/rust-plasma`.
2.  Initialize a new Git repository.
3.  Create an initial `.gitignore` file appropriate for a Rust project. Include common Rust build artifacts (e.g., `target/`), OS-specific files (e.g., `.DS_Store`, `Thumbs.db`), and common IDE/editor files (e.g., `.vscode/`, `.idea/`).
4.  Stage the `.gitignore` file.
5.  Make an initial commit with the message: "Initial commit: Initialize Git repository and add .gitignore".

**Best Practices to Adhere To:**
*   Ensure the `.gitignore` is comprehensive enough for typical Rust development to keep the repository clean.
*   Follow standard Git commit message conventions.

**Expected Outcome:**
*   A new Git repository initialized in `/Users/lucasvalente/rust-plasma`.
*   A well-formed `.gitignore` file present in the root.
*   An initial commit reflecting these changes.

Please confirm once these steps are completed.
```

---

### Task: Set up project structure (folders for `src`, `docs`, `tests`, `ui`, etc.).
(Corresponds to `TODO.md` Pre-Sprint Task 2)

**Prompt Text:**
```
Assistant,

The Git repository is initialized. Now, we need to establish the standard project directory structure for the "Plasma Furnace Simulator".

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Project Root:** `/Users/lucasvalente/rust-plasma`
*   **Language/Framework:** Primarily Rust, with Tauri for the UI (implying a potential `src-tauri` directory later, but focus on the core structure for now).
*   **Existing `src` directory structure:**
    *   `errors`
    *   `formula`
    *   `lib.rs`
    *   `logging`
    *   `main.rs`
    *   `plugins`
    *   `simulation`
    *   `tests.rs`
*   **Goal:** Create a clean, conventional, and scalable directory structure. The `TODO.md` mentions `src`, `docs`, `tests`, `ui`.

**Instructions:**
1.  **Verify `src`:** The `src` directory already exists and contains relevant Rust modules. No changes are needed within `src` at this stage unless you identify an immediate best-practice adjustment for a Rust library/binary project (e.g., ensuring `main.rs` and `lib.rs` are appropriately placed for a mixed binary/library crate if that's the intent). For now, assume the current `src` layout is the starting point.
2.  **Create `docs` directory:** At the project root (`/Users/lucasvalente/rust-plasma`), create a directory named `docs`. This will house project documentation, architectural diagrams, requirements, etc. Add a `.gitkeep` file if it's initially empty but intended for version control.
3.  **Create `tests` directory:** At the project root, create a top-level `tests` directory. This directory is conventionally used for integration tests in Rust projects (files within are typically treated as separate crates). The existing `tests.rs` file inside `src` is likely for unit tests or module-specific integration tests; leave it as is. The new top-level `tests` directory will be for broader integration tests. Add a placeholder `.gitkeep` file within this new `tests` directory.
4.  **Consider `ui` directory:** The `TODO.md` mentions a `ui` directory. Given this is a Tauri project, UI code will likely reside within `src-tauri`, managed by the Tauri CLI. For now, **do not create a top-level `ui` directory.** Defer specific UI structure to Tauri integration sprints.
5.  **Create `assets` directory:** At the project root, create an `assets` directory. This can be used for sample input files, material databases, validation data, icons, etc. Add a `.gitkeep` file.

**Best Practices to Adhere To:**
*   Follow Rust project conventions (e.g., top-level `tests` for integration tests).
*   Ensure the structure is logical and promotes separation of concerns.
*   Use `.gitkeep` for initially empty directories that should be version-controlled.

**Expected Outcome:**
*   The following directories exist at `/Users/lucasvalente/rust-plasma`:
    *   `docs` (potentially with `requirements.md`, `TODO.md` moved here later, add `.gitkeep` if empty now)
    *   `tests` (with a `.gitkeep`)
    *   `assets` (with a `.gitkeep`)
*   The existing `src` directory remains as is.

Please stage these new directories (with their `.gitkeep` files) and commit them with an appropriate message like "Feat: Set up initial project directory structure (docs, tests, assets)".
```

---

### Task: Configure CI/CD pipeline basics (e.g., linting, basic build checks on push).
(Corresponds to `TODO.md` Pre-Sprint Task 3)

**Prompt Text:**
```
Assistant,

With the project structure in place, let's set up basic CI/CD. We'll start with GitHub Actions as it's commonly used and integrates well.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Project Root:** `/Users/lucasvalente/rust-plasma`
*   **Language:** Rust
*   **Goal:** Automate linting and basic build checks on every push to `main` (or `master`) and for pull requests targeting `main`.
*   **Current State:** No CI configuration exists.

**Instructions:**
1.  **Create Workflow Directory:** In the project root, create the directory structure `.github/workflows`.
2.  **Create Rust CI Workflow File:** Inside `.github/workflows`, create a YAML file named `rust_ci.yml` (or a similar descriptive name).
3.  **Define Workflow:** Populate `rust_ci.yml` with a GitHub Actions workflow that:
    *   Triggers on `push` to the `main` branch and on `pull_request` targeting the `main` branch.
    *   Sets up a Linux environment (e.g., `ubuntu-latest`).
    *   Checks out the repository code.
    *   Installs the stable Rust toolchain.
    *   Caches Rust dependencies (e.g., `~/.cargo`, `target/`) to speed up subsequent runs.
    *   Runs `cargo fmt --all -- --check` to check formatting.
    *   Runs `cargo clippy --all-targets --all-features -- -D warnings` to perform linting and treat warnings as errors.
    *   Runs `cargo test --all-targets --all-features` to execute tests.
    *   Runs `cargo build --all-targets --all-features` to ensure the project builds. Consider `--release` for a more thorough check if build times allow, but debug build is fine for initial CI.

**Best Practices to Adhere To:**
*   Ensure the workflow is efficient (e.g., uses caching).
*   Follow GitHub Actions YAML syntax and best practices.
*   Clippy command should be strict (`-D warnings`).
*   Ensure all relevant targets and features are checked/built/tested.

**Expected Outcome:**
*   A `.github/workflows/rust_ci.yml` file is created with the specified workflow.
*   This workflow should be ready to run on GitHub when the code is pushed.

Please stage this new workflow file and commit it with a message like "Build: Add basic Rust CI workflow (format, clippy, test, build)".
```

---

### Task: Initial project `README.md` with setup and build instructions.
(Corresponds to `TODO.md` Pre-Sprint Task 4)

**Prompt Text:**
```
Assistant,

We need an initial `README.md` file for the "Plasma Furnace Simulator" project.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Project Root:** `/Users/lucasvalente/rust-plasma`
*   **Goal:** Provide essential information for anyone new to the project, including setup and build instructions.
*   **Target Audience:** Developers, researchers using the source.
*   **Current State:** No `README.md` exists yet (or if one exists from `cargo init`, it needs to be significantly enhanced).

**Instructions:**
1.  **Create/Update `README.md`:** In the project root, create or update the `README.md` file.
2.  **Content:** Include the following sections:
    *   **Project Title:** "Plasma Furnace Simulator" (e.g., `# Plasma Furnace Simulator`).
    *   **Brief Description:** A one or two-sentence overview of what the project is (refer to `requirements.md` 1.1 Purpose for inspiration: "A locally installable desktop tool... to simulate, visualize, analyze and validate heat propagation...").
    *   **Current Status (Optional but good):** Briefly mention it's under active development (e.g., "Status: Alpha - Under Active Development").
    *   **Prerequisites:** List necessary tools to build and run the project (e.g., Rust (specify version if known, e.g., latest stable), Cargo). Mention Tauri prerequisites if they are known at this stage, but keep it high-level.
    *   **Setup Instructions:**
        *   How to clone the repository.
        *   Any one-time setup steps (e.g., `rustup update stable`).
    *   **Build Instructions:**
        *   Command to build the project (e.g., `cargo build`).
        *   Command to build in release mode (e.g., `cargo build --release`).
    *   **Running the Simulator:**
        *   Command to run the application (e.g., `cargo run`). (This will likely evolve once Tauri is integrated, to `cargo tauri dev`). For now, standard `cargo run` is fine as a placeholder if `main.rs` can produce some output or a basic window.
    *   **Running Tests:**
        *   Command to run tests (e.g., `cargo test`).
    *   **Project Structure (Brief):** A very brief overview of key directories (e.g., `src` for source code, `docs` for documentation, `tests` for integration tests).
    *   **Contributing (Placeholder):** A small section stating that contribution guidelines will be added later (e.g., "Contributions are welcome! Please see `CONTRIBUTING.md` (to be created) for details.").

**Best Practices to Adhere To:**
*   Use Markdown effectively for readability.
*   Ensure instructions are clear, concise, and accurate for a Rust project.
*   Provide commands that users can copy and paste.
*   Anticipate that some instructions (especially for running the UI) will evolve.

**Expected Outcome:**
*   A comprehensive initial `README.md` file in the project root.

Please stage this `README.md` file and commit it with a message like "Docs: Add initial README.md with project overview and setup instructions".
```

---

### Task: Establish conventions for ongoing creation of supporting design documents.
(Corresponds to `TODO.md` Pre-Sprint Task 5)

**Prompt Text:**
```
Assistant,

To ensure consistency and maintainability of our project documentation, we need to establish conventions for the ongoing creation of supporting design documents.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Project Root:** `/Users/lucasvalente/rust-plasma`
*   **`docs` directory:** `/Users/lucasvalente/rust-plasma/docs` (created in a previous step).
*   **Goal:** Define a standard approach for creating, storing, and formatting key design documents that will be developed alongside features. This task is about defining the *conventions*, not creating all documents now.

**Instructions:**
1.  **Create a `DOCUMENTATION_CONVENTIONS.md` file:** Inside the `docs` directory (ensure `docs` directory exists first), create a new Markdown file named `DOCUMENTATION_CONVENTIONS.md`.
2.  **Content for `DOCUMENTATION_CONVENTIONS.md`:**
    *   **Introduction:** Briefly state the purpose of this document – to outline conventions for project documentation.
    *   **Storage Location:**
        *   Specify that all primary design documents (Use Cases, Sequence Diagrams, Architecture Docs, etc.) should be stored within the `/docs` directory.
        *   Suggest subdirectories within `/docs` for organization as the number of documents grows (e.g., `/docs/architecture`, `/docs/diagrams`, `/docs/use-cases`).
    *   **Preferred Formats:**
        *   **Textual Documents:** Markdown (`.md`) is the preferred format for textual documents (e.g., design notes, meeting minutes, this conventions file itself).
        *   **Diagrams:**
            *   Recommend using a widely accessible and preferably text-based or easily version-controlled diagramming tool/format. Examples:
                *   Mermaid JS (can be embedded in Markdown).
                *   PlantUML (text-based, good for version control).
                *   Draw.io (or diagrams.net) - recommend exporting to SVG (for quality and version-friendliness) or PNG, and if using the `.drawio` source file, commit that as well.
            *   State that source files for diagrams (e.g., `.drawio`, `.puml`) should be committed alongside their exported image versions (e.g., SVG, PNG) in the relevant `docs` subdirectory.
        *   **Spreadsheets/Tables:** If complex tables are needed, CSV is preferred for version control friendliness. For rich tables in Markdown, guide on using Markdown table syntax.
    *   **Naming Conventions:**
        *   Suggest a consistent naming convention for files (e.g., `snake_case_for_filenames.md`, `PascalCaseForDiagrams.svg`). Pick one and state it (e.g., recommend `kebab-case-for-filenames.md` and `kebab-case-for-diagrams.svg`).
    *   **Version Control:**
        *   Emphasize that all documents in `/docs` must be committed to the Git repository.
    *   **Review Process (Lightweight for now):**
        *   Mention that significant new design documents or major changes to existing ones should ideally be part of a pull request for brief team review, if applicable to team structure.
    *   **Content Guidelines (High-Level):**
        *   Encourage clarity, conciseness.
        *   For diagrams, ensure they have titles, legends if necessary, and are understandable.
    *   **List of Anticipated Key Documents (Examples - to be created later):**
        *   Briefly list types of documents we anticipate creating (linking to `requirements.md` section 6 for inspiration): Use Cases, Sequence Diagrams, Class Diagrams (key data structures), State Machine Diagrams (simulation lifecycle), ADRs (Architecture Decision Records). This is just to set expectations.

**Best Practices to Adhere To:**
*   The conventions should be practical and easy to follow.
*   Prioritize formats and tools that are developer-friendly and work well with version control.
*   This document itself should be an example of good Markdown formatting.

**Expected Outcome:**
*   A `docs/DOCUMENTATION_CONVENTIONS.md` file establishing clear guidelines for creating and managing project design documents.

Please stage this new file and commit it with a message like "Docs: Establish documentation conventions".
```

---

### Task: Choose and configure issue tracking and project management tools (e.g., Jira, Trello, GitHub Issues).
(Corresponds to `TODO.md` Pre-Sprint Task 6)

**Prompt Text:**
```
Assistant,

This task, "Choose and configure issue tracking and project management tools (e.g., Jira, Trello, GitHub Issues)," typically involves actions outside direct file manipulation within the IDE, such as setting up a project on a web platform.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Goal:** Select and prepare a system for tracking tasks, bugs, features, and overall project progress.
*   **Common Options:** Jira, Trello, Asana, GitHub Issues.

**Instructions (Conceptual - as an AI in an IDE, you can't directly do this, but you can provide guidance to the USER):**
1.  **Recommendation (Simulated):** Given this is a software project likely hosted on GitHub (due to GitHub Actions CI setup), **GitHub Issues** is an excellent, tightly integrated choice. It supports labels, milestones, assignees, and project boards (Kanban-style).
2.  **Guidance for Manual Setup (User Action):**
    *   Advise the USER to navigate to the GitHub repository for this project (once it's created and pushed).
    *   Enable "Issues" if not already enabled.
    *   Consider creating initial labels relevant to this project, for example:
        *   `type:bug`
        *   `type:feature`
        *   `type:enhancement`
        *   `type:docs`
        *   `type:task`
        *   `area:ui/ux`
        *   `area:backend/core`
        *   `area:physics`
        *   `area:ci/cd`
        *   `sprint:pre-sprint` (and subsequently for other sprints, or use Milestones for sprints)
        *   `priority:high`, `priority:medium`, `priority:low`
        *   `status:good first issue`
        *   `status:needs-discussion`
    *   Consider setting up a "Project Board" (under the "Projects" tab on GitHub) to visualize sprint tasks. A Kanban board with columns like "Backlog," "To Do (Sprint X)," "In Progress," "In Review," "Done" would be a good start.
    *   The tasks from `TODO.md` (especially the ROADMAP LIST) should then be transcribed into issues on this platform, assigned to relevant sprints (e.g., using labels or milestones), and prioritized.

**Expected Outcome (from User action, guided by AI):**
*   A decision is made on the issue tracking tool (recommend GitHub Issues).
*   The chosen tool is set up for the "Plasma Furnace Simulator" project with appropriate initial configuration (labels, possibly a project board).
*   A plan is in place to populate it with tasks from `TODO.md`.

**AI Action (if any possible within IDE context):**
*   If you have capabilities to interact with GitHub APIs (and with appropriate authentication), you *could* potentially create labels or issues. However, this is advanced and often not a standard IDE AI feature for this type of task.
*   **Primary AI action:** Provide the above guidance clearly to the user. No direct file changes are expected for this task within the project repository itself, unless we decide to document the choice and basic setup process in `docs/PROJECT_MANAGEMENT_SETUP.md` or similar. For now, no file changes needed for this specific task.

This task is marked as "done" in the `TODO.md` once the USER confirms the external setup is complete based on this guidance.
```

---
## Sprint 1: Basic UI Shell & Core Furnace Geometry Input

### Task: User Interface & Experience: Implement main window structure, basic menu (File > Exit), and placeholder content areas using Tauri.
(Corresponds to `TODO.md` Sprint 1 Task 1)

**Prompt Text:**
```
Assistant,

We are commencing Sprint 1. The first task is to lay the groundwork for our Tauri-based desktop application by implementing the main window structure, a basic menu, and placeholder content areas.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Project Root:** `/Users/lucasvalente/rust-plasma`
*   **Framework:** Tauri (Rust backend, web frontend - HTML, CSS, JS).
*   **Goal:** Create a runnable Tauri application shell. This involves initializing Tauri if not already present, defining the main application window, adding a minimal menu, and structuring the UI with placeholders for future components. (FR6.1, FR6.2)
*   **Current State:** Assume basic Rust project structure exists. Tauri might need initialization.

**Instructions:**
1.  **Initialize Tauri (if not done):**
    *   Ensure Tauri is set up for the project. If `src-tauri` directory and `tauri.conf.json` do not exist, guide the user to run `cargo tauri init` with appropriate settings (e.g., window title "Plasma Furnace Simulator", web asset path, dev server URL). For this prompt, assume these will be set up or you will guide their creation.
2.  **Configure Main Window:**
    *   In `tauri.conf.json` (or via Rust setup if preferred for more dynamic control later), define the main window properties:
        *   Set a clear `title` (e.g., "Plasma Furnace Simulator v0.1").
        *   Define a reasonable initial `width` (e.g., 1024) and `height` (e.g., 768).
3.  **Implement Basic Menu:**
    *   Using Tauri's menu capabilities (either in `tauri.conf.json` for static menus or programmatically in Rust for dynamic ones), implement a simple top menu bar:
        *   File
            *   Exit (should close the application).
4.  **Structure Frontend with Placeholders (HTML/CSS):**
    *   In your frontend (e.g., `index.html` and a linked `style.css` within the Tauri web assets directory like `src-tauri/src` or configured `distDir`):
        *   Create a basic layout. For example:
            *   A top navigation bar (can be minimal or just for the menu).
            *   A main content area, potentially split into:
                *   A left sidebar (e.g., `div id="sidebar-controls"`) for future input controls.
                *   A central area (e.g., `div id="main-visualization"`) for the primary simulation visualization.
            *   A bottom status bar (e.g., `div id="status-bar"`) for messages and progress.
        *   Use simple HTML and CSS to define these areas. They can just be colored blocks or have placeholder text for now (e.g., "Controls Area", "Visualization Area", "Status").
5.  **Ensure Application Runs:**
    *   The application must build and run using `cargo tauri dev`.
    *   The main window should appear with the title, dimensions, menu, and placeholder layout.
    *   The "File > Exit" menu item should correctly close the application.

**Best Practices to Adhere To:**
*   Follow Tauri conventions for project structure and configuration.
*   Keep frontend code (HTML, CSS, JS) well-organized (e.g., separate CSS file).
*   Write clean, semantic HTML.
*   Ensure the application is functional and testable at the end of this task.

**Expected Outcome:**
*   A runnable Tauri application (`cargo tauri dev`).
*   Main window displays with correct title and initial size.
*   A functional "File > Exit" menu.
*   The UI shows basic placeholder sections for controls, visualization, and status.

Provide the necessary file modifications (e.g., `tauri.conf.json`, `main.rs` for menu if programmatic, `index.html`, `style.css`).
```

---

### Task: User Interface & Experience: UI input fields for furnace cylinder height and diameter (FR1.1) with basic on-the-fly validation (FR1.10 - e.g., positive numbers only).
(Corresponds to `TODO.md` Sprint 1 Task 2)

**Prompt Text:**
```
Assistant,

Building upon the basic Tauri shell, this task involves adding the first interactive UI elements: input fields for furnace cylinder height and diameter, along with basic client-side validation.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Relevant Requirements:** FR1.1 (Geometry Input: height, diameter), FR1.10 (Input Validation).
*   **Current UI State:** Main window with placeholder areas, including a sidebar (`div id="sidebar-controls"`) and potentially a status bar (`div id="status-bar"`).
*   **Goal:** Implement two number input fields in the designated sidebar area. These fields should have labels and basic real-time validation to ensure only positive numbers are entered. Validation messages should be displayed.

**Instructions:**
1.  **Locate Sidebar Area:** Identify the HTML element designated as the sidebar for controls (e.g., `<div id="sidebar-controls">`).
2.  **Add Input Fields (HTML):**
    *   Inside the sidebar, add input fields for:
        *   **Furnace Cylinder Height:** Label: "Furnace Height (m)". Input: `<input type="number" id="furnace-height" name="furnace-height" step="0.1">`.
        *   **Furnace Cylinder Diameter:** Label: "Furnace Diameter (m)". Input: `<input type="number" id="furnace-diameter" name="furnace-diameter" step="0.1">`.
    *   Add small `<span>` or `<div>` elements next to/below each input to display validation messages (e.g., `<span id="height-validation-msg" class="validation-error"></span>`).
3.  **Implement Client-Side Validation (JavaScript):**
    *   Create a JavaScript function (e.g., in `src-tauri/src/main.js` or an equivalent JS file linked to your `index.html`).
    *   Add event listeners (`input` or `change`) to both input fields.
    *   On input, the validation logic should:
        *   Retrieve the current value from the input field.
        *   Check if the value is a valid number (not empty, `isNaN` is false).
        *   Check if the value is greater than zero.
        *   If invalid, display an appropriate message in the corresponding validation message element (e.g., "Must be a positive number", "Required"). Style these messages to be noticeable (e.g., red text).
        *   If valid, clear any existing validation message for that field.
4.  **Styling (CSS):**
    *   Add basic styling for the input fields, labels, and validation messages to ensure they are presentable and readable within the sidebar.

**Best Practices to Adhere To:**
*   Provide clear, immediate feedback for validation (FR1.10).
*   Use appropriate HTML5 input types (`type="number"`) and attributes (`step` for numeric increments).
*   Keep JavaScript focused on UI interaction and validation for this task.
*   Ensure error messages are user-friendly.

**Expected Outcome:**
*   The UI sidebar now contains input fields for "Furnace Height (m)" and "Furnace Diameter (m)".
*   As the user types:
    *   If non-numeric or non-positive values are entered, a validation error message appears next to the respective field.
    *   If valid positive numbers are entered, error messages are cleared.
*   The layout remains clean and functional.

Provide modifications to the relevant HTML, CSS, and JavaScript files.
```

---

### Task: Core Simulation & Physics: Backend stubs/data structures to receive and store furnace geometry from UI.
(Corresponds to `TODO.md` Sprint 1 Task 3)

**Prompt Text:**
```
Assistant,

With the UI input fields for furnace geometry in place, we now need to connect these to the Rust backend. This task involves creating backend data structures to hold this geometry and implementing a Tauri command to receive the data from the frontend.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Framework:** Tauri (Rust backend).
*   **Data Flow:** Frontend (JavaScript) will send height and diameter values to the Rust backend.
*   **Goal:** Define a Rust struct for furnace geometry. Create a Tauri command that accepts height and diameter, logs them, and conceptually stores them (e.g., in application state or just logs for now as a stub). The frontend should call this command.

**Instructions:**
1.  **Define Rust Data Structure (`src/.../mod.rs` or a new `geometry.rs` module):
    *   Create a public Rust struct, for example `FurnaceGeometry`:
      ```rust
      use serde::{Serialize, Deserialize};

      #[derive(Debug, Clone, Serialize, Deserialize)]
      pub struct FurnaceGeometry {
          pub height: f64,
          pub diameter: f64,
      }
      ```
    *   Ensure it derives `Debug` (for logging/printing), `Clone`, `Serialize`, and `Deserialize` (for Tauri command arguments and potential state management).
    *   Place this struct in an appropriate module (e.g., `src/simulation/geometry.rs` and `pub mod geometry;` in `src/simulation/mod.rs`, or a more general `src/core_types.rs`).

2.  **Create Tauri Command (in `src/main.rs` or a dedicated commands module):
    *   Define an asynchronous Tauri command, e.g., `submit_furnace_geometry`:
      ```rust
      // Potentially in a new src/commands.rs module, or directly in main.rs
      use crate::APP_STATE_STRUCT_IF_USED; // If using shared state
      // use crate::simulation::geometry::FurnaceGeometry; // Adjust path as needed

      #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)] // Example struct, define properly
      pub struct FurnaceGeometry {
          pub height: f64,
          pub diameter: f64,
      }

      #[tauri::command]
      async fn submit_furnace_geometry(geometry: FurnaceGeometry, state: tauri::State<'_, AppState>) -> Result<(), String> { // AppState example
          println!("Received furnace geometry: {:?}", geometry);
          // TODO: Store geometry in application state if applicable for this sprint's goal
          // let mut app_data = state.0.lock().await; // Example for Mutex-wrapped state
          // app_data.furnace_geometry = Some(geometry);
          Ok(())
      }
      ```
    *   This command should accept the `FurnaceGeometry` struct as an argument.
    *   For now, the command should at least print the received geometry using `println!("Received furnace geometry: {:?}", geometry);` or a proper logger.
    *   (Optional for stub, but good for future: Consider how application state might be managed, e.g., using `tauri::State` and a Mutex-wrapped struct. For this task, logging is the primary verification means for the "stub".)

3.  **Register the Command:**
    *   In your `main.rs` (or wherever your Tauri app is built), add the new command to the `.invoke_handler()`:
      ```rust
      fn main() {
          // ... (Define AppState, FurnaceGeometry etc. or import them)
          tauri::Builder::default()
              // .manage(AppState(Default::default())) // If using shared state
              .invoke_handler(tauri::generate_handler![
                  submit_furnace_geometry,
                  // other_commands...
              ])
              .run(tauri::generate_context!()) 
              .expect("error while running tauri application");
      }
      ```

4.  **Invoke Command from Frontend (JavaScript):
    *   In your frontend JavaScript, after successful validation of height and diameter (perhaps triggered by a new "Submit Geometry" button, or on valid input if preferred):
        *   Import `invoke` from `@tauri-apps/api/tauri`.
        *   Call the `submit_furnace_geometry` command, passing an object with `height` and `diameter`.
          ```javascript
          // import { invoke } from '@tauri-apps/api/tauri';
          // Assume heightValue and diameterValue are validated positive numbers
          // document.getElementById('submit-geometry-button').addEventListener('click', async () => {
          //  const heightValue = parseFloat(document.getElementById('furnace-height').value);
          //  const diameterValue = parseFloat(document.getElementById('furnace-diameter').value);
          //  if (heightValue > 0 && diameterValue > 0) { // Re-check or trust prior validation
          //      try {
          //          await invoke('submit_furnace_geometry', { geometry: { height: heightValue, diameter: diameterValue } });
          //          console.log('Furnace geometry submitted successfully.');
          //      } catch (error) {
          //          console.error('Error submitting furnace geometry:', error);
          //      }
          //  } else {
          //      console.warn('Attempted to submit invalid geometry.');
          //  }
          // });
          ```
        *   Add a button (e.g., `<button id="submit-geometry-button">Submit Geometry</button>`) in the HTML for triggering this.

**Best Practices to Adhere To:**
*   Clear separation between frontend and backend logic.
*   Use `async` for Tauri commands where appropriate.
*   Properly structure Rust code into modules.
*   Use `serde` for serialization/deserialization between JS and Rust.
*   Handle potential errors from `invoke` on the frontend (e.g., `try...catch`).

**Expected Outcome:**
*   A Rust struct `FurnaceGeometry` is defined.
*   A Tauri command `submit_furnace_geometry` is implemented and registered.
*   The frontend UI (e.g., via a button) can call this command, passing the height and diameter.
*   The Rust backend logs the received geometry data to the console.
*   The system provides a basic, verifiable link between UI input and backend processing stubs.

Provide modifications to relevant Rust files (`main.rs`, new geometry module) and JavaScript/HTML files.
```

---

## Sprint 2: Basic Simulation Control & Feedback

### Task: User Interface & Experience: Basic simulation control (Start, Stop, Pause placeholder buttons).
(Corresponds to `TODO.md` Sprint 2 Task 1)

**Prompt Text:**
```
Assistant,

For Sprint 2, our first UI task is to implement basic simulation control buttons: Start, Stop, and Pause.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Current UI State:** Main window with placeholder areas, including a sidebar (`div id="sidebar-controls"`) and potentially a status bar (`div id="status-bar"`).
*   **Goal:** Add three distinct buttons for simulation control to the UI, likely in the sidebar or a dedicated control panel area. These buttons will be placeholders initially, meaning their full functionality will be wired up in subsequent tasks/sprints, but they should be clickable and visually distinct. (FR2.4 partial)

**Instructions:**
1.  **Locate Control Area:** Identify a suitable HTML element for these buttons (e.g., within `<div id="sidebar-controls">` or a new specific control panel div).
2.  **Add Buttons (HTML):**
    *   Create three buttons:
        *   `<button id="start-simulation-btn">Start Simulation</button>`
        *   `<button id="stop-simulation-btn">Stop Simulation</button>`
        *   `<button id="pause-simulation-btn">Pause Simulation</button>`
    *   Initially, the Stop and Pause buttons might be disabled until a simulation is 'started'. Consider adding the `disabled` attribute to them by default.
3.  **Basic Styling (CSS):**
    *   Apply minimal styling to make the buttons clearly identifiable and usable. Ensure they are grouped logically.
4.  **Placeholder JavaScript Logic (Optional for this specific task, but good to anticipate):
    *   You might add very basic JavaScript to toggle the `disabled` state of Stop/Pause when Start is clicked (and vice-versa) as a purely visual/UX placeholder for now. Full state management will come later.

**Best Practices to Adhere To:**
*   Use clear and descriptive IDs for buttons.
*   Consider initial button states (e.g., Stop/Pause disabled).
*   Ensure buttons are accessible and have clear labels.

**Expected Outcome:**
*   Three buttons (Start, Stop, Pause) are visible in the UI.
*   Buttons are styled for clarity.
*   (Optional) Basic JS logic for enabling/disabling Stop/Pause buttons based on Start button interaction (visual feedback only for now).

Provide modifications to the relevant HTML and CSS files. JavaScript for simple enable/disable logic is optional but welcome if straightforward.
```

---

### Task: User Interface & Experience: UI text area/panel to display simple simulation status messages.
(Corresponds to `TODO.md` Sprint 2 Task 2)

**Prompt Text:**
```
Assistant,

To provide feedback to the user, we need a dedicated UI area to display simulation status messages.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Relevant Requirement:** FR2.3 (Simulation Feedback).
*   **Current UI State:** Main window with placeholder areas, potentially including a bottom status bar (`div id="status-bar"`).
*   **Goal:** Implement a text area or panel where messages like "Simulation Started," "Simulation Stopped," or error notifications can be displayed. This area should be updatable via JavaScript.

**Instructions:**
1.  **Identify/Create Status Area (HTML):**
    *   Locate or create a suitable HTML element for displaying status messages. A `div` within the previously defined status bar (`<div id="status-bar">`) or a dedicated panel would be appropriate.
    *   Example: `<div id="simulation-status-panel">Welcome to Plasma Furnace Simulator.</div>`
2.  **Styling (CSS):**
    *   Apply styling to this panel to make it distinct and readable (e.g., background color, padding, font style).
    *   Ensure it can accommodate a few lines of text if needed.
3.  **JavaScript Function to Update Status:**
    *   In your primary JavaScript file (e.g., `main.js`):
        *   Create a function (e.g., `updateSimulationStatus(message)`) that takes a string argument.
        *   This function should select the status panel HTML element (e.g., by its ID) and update its `textContent` or `innerHTML` with the provided message.
        *   Call this function with an initial welcome message when the application loads (e.g., `updateSimulationStatus("System ready. Please define geometry and start simulation.");`).

**Best Practices to Adhere To:**
*   Ensure the status area is easily noticeable but not obtrusive.
*   The JavaScript function for updating the status should be reusable.
*   Consider how multiple messages might be handled in the future (e.g., appending, clearing), though simple replacement is fine for now.

**Expected Outcome:**
*   A designated area in the UI displays status messages.
*   This area is populated with an initial welcome message on application load.
*   A JavaScript function exists to allow dynamic updating of this status message area.

Provide modifications to the relevant HTML, CSS, and JavaScript files.
```

---

### Task: Core Simulation & Physics: Basic Tauri command to invoke a placeholder backend "simulation" function when "Start" is clicked and receive a simple status update.
(Corresponds to `TODO.md` Sprint 2 Task 3)

**Prompt Text:**
```
Assistant,

This task bridges the UI simulation controls with the Rust backend by creating a placeholder simulation command.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Framework:** Tauri (Rust backend, JS frontend).
*   **Current State:** UI has Start/Stop/Pause buttons and a status message area. A `FurnaceGeometry` struct and a `submit_furnace_geometry` command might exist from Sprint 1.
*   **Goal:** Implement a new Tauri command (e.g., `start_simulation_placeholder`) that, when invoked, simulates a 'start' action by logging a message on the backend and returning a status message to the frontend. The frontend's "Start Simulation" button should call this command and update the UI status panel with the result.

**Instructions:**
1.  **Define Placeholder Backend Function (Rust):
    *   Create a new Rust function (this doesn't have to be the command itself yet, but the logic it would call). For example:
      ```rust
      // In an appropriate module, e.g., src/simulation/engine.rs or similar
      pub fn run_placeholder_simulation(/* geometry: &FurnaceGeometry */) -> Result<String, String> {
          println!("Backend: Placeholder simulation started.");
          // In a real scenario, actual simulation logic would run here.
          // For now, we just pretend and return a success message.
          Ok("Placeholder simulation initiated successfully by backend.".to_string())
      }
      ```
    *   This function should log that it has been called and return a `Result<String, String>` where `Ok` contains a success message and `Err` would contain an error message.

2.  **Create Tauri Command (`start_simulation_placeholder`):
    *   Define an asynchronous Tauri command in `src/main.rs` or your commands module:
      ```rust
      // #[tauri::command]
      // async fn start_simulation_placeholder(state: tauri::State<'_, AppState>) -> Result<String, String> { // AppState example
      //     println!("Tauri Command: start_simulation_placeholder invoked.");
      //     // Potentially retrieve furnace_geometry from AppState if needed by run_placeholder_simulation
      //     // let app_data = state.0.lock().await;
      //     // match &app_data.furnace_geometry {
      //     //     Some(geom) => crate::simulation::engine::run_placeholder_simulation(geom),
      //     //     None => Err("Error: Furnace geometry not set.".to_string()),
      //     // }
      //     // For now, a simpler version without state dependency for placeholder:
      //     crate::simulation::engine::run_placeholder_simulation() // Assuming it's modified not to take geometry for this simple placeholder
      // }
      ```
      Adjust the command to call your placeholder function. For simplicity in this placeholder task, `run_placeholder_simulation` could be modified not to require geometry, or you can pass dummy/default geometry if the structure from Sprint 1 is robustly in place and accessible via `AppState`.
      For this task, let's simplify: the command itself can just log and return a string directly if `run_placeholder_simulation` adds too much immediate complexity for a *placeholder*.
      ```rust
      #[tauri::command]
      async fn start_simulation_placeholder() -> Result<String, String> {
          println!("Tauri Command: start_simulation_placeholder invoked.");
          // Simulate some work or a check
          Ok("Backend reports: Placeholder simulation started successfully.".to_string())
      }
      ```

3.  **Register the Command:**
    *   Add `start_simulation_placeholder` to the `.invoke_handler()` in `main.rs`.

4.  **Invoke Command from Frontend (JavaScript):
    *   Modify the event listener for the "Start Simulation" button (`#start-simulation-btn`).
    *   When clicked, it should:
        *   Import `invoke` from `@tauri-apps/api/tauri`.
        *   Call the `start_simulation_placeholder` command.
        *   On success (promise resolves), update the UI status panel (using the `updateSimulationStatus` function from the previous task) with the message returned from the backend.
        *   On error (promise rejects), update the UI status panel with the error message.
        *   Optionally, disable the Start button and enable Stop/Pause buttons.
          ```javascript
          // import { invoke } from '@tauri-apps/api/tauri';
          // Assuming updateSimulationStatus(message) function exists.
          // const startBtn = document.getElementById('start-simulation-btn');
          // const stopBtn = document.getElementById('stop-simulation-btn');
          // const pauseBtn = document.getElementById('pause-simulation-btn');

          // startBtn.addEventListener('click', async () => {
          //  try {
          //      updateSimulationStatus('Attempting to start simulation...');
          //      const backendMessage = await invoke('start_simulation_placeholder');
          //      updateSimulationStatus(backendMessage);
          //      startBtn.disabled = true;
          //      stopBtn.disabled = false;
          //      pauseBtn.disabled = false;
          //  } catch (error) {
          //      updateSimulationStatus(`Error starting simulation: ${error}`);
          //      // Ensure buttons are in a consistent state on error
          //      startBtn.disabled = false;
          //      stopBtn.disabled = true;
          //      pauseBtn.disabled = true;
          //  }
          // });
          ```

**Best Practices to Adhere To:**
*   Clear distinction between UI actions and backend command handlers.
*   Use `async/await` for invoking Tauri commands from JS.
*   Provide user feedback for both success and failure of backend operations.
*   Ensure backend commands return meaningful `Result` types.

**Expected Outcome:**
*   A new Tauri command `start_simulation_placeholder` exists in the Rust backend.
*   Clicking the "Start Simulation" button in the UI calls this command.
*   The Rust backend logs an appropriate message.
*   The UI status panel is updated with the success or error message returned from the backend command.
*   Basic button state changes (Start disabled, Stop/Pause enabled) occur on successful start.

Provide modifications to relevant Rust files (e.g., `main.rs`, `simulation/engine.rs`) and JavaScript files.
```
---

## Sprint 3: Plasma Torch Parameter Input

### Task: User Interface & Experience: UI for defining number of torches (e.g., a simple number input) (FR1.2 part).
(Corresponds to `TODO.md` Sprint 3 Task 1)

**Prompt Text:**
```
Assistant,

We are now starting Sprint 3, focusing on plasma torch parameter input. The first step is to allow the user to define the number of torches.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Relevant Requirements:** FR1.2 (Torch Configuration: number of torches).
*   **Current UI State:** The UI includes a sidebar (e.g., `<div id="sidebar-controls">`) where furnace geometry inputs (height, diameter) were added in Sprint 1. Simulation control buttons and a status panel were added in Sprint 2.
*   **Goal:** Implement a UI element, specifically a number input field, within the sidebar to allow the user to specify how many plasma torches will be used in the simulation. This input should have basic validation (e.g., integer, non-negative, perhaps a reasonable upper limit like 10 for now).

**Instructions:**
1.  **Locate Control Area:** Within the main HTML file (e.g., `index.html`), find the sidebar section (`<div id="sidebar-controls">`).
2.  **Add Number of Torches Input (HTML):**
    *   Add a new section or group within the sidebar for "Torch Configuration".
    *   Inside this section, add a label and a number input field:
        *   Label: "Number of Torches:"
        *   Input: `<input type="number" id="number-of-torches" name="number-of-torches" min="0" max="10" step="1" value="1">` (Default to 1 torch, allow 0 for no torches if sensible, or min 1 if a torch is always expected).
    *   Add a `<span>` or `<div>` element next to/below this input for validation messages (e.g., `<span id="num-torches-validation-msg" class="validation-error"></span>`).
3.  **Implement Client-Side Validation (JavaScript):**
    *   In your primary JavaScript file (e.g., `main.js`):
        *   Add an event listener (`input` or `change`) to the `#number-of-torches` input field.
        *   The validation logic should ensure the entered value is an integer, non-negative, and within the specified `min`/`max` range (e.g., 0-10).
        *   Display appropriate validation messages in `#num-torches-validation-msg` if invalid (e.g., "Must be an integer between 0 and 10.").
        *   Clear the message if the input is valid.
        *   Crucially, the value from this input will determine how many sets of torch parameter fields are displayed in the next task. Therefore, when this value changes and is valid, it should trigger a JavaScript function (to be fully implemented in the next task) to dynamically generate or update the UI for individual torch parameters. For *this* task, you can simply log to the console that this function would be called, e.g., `console.log("Number of torches changed to: " + numTorches + ". Would now update torch parameter UI.");`
4.  **Styling (CSS):**
    *   Ensure the new input field, label, and validation message are styled consistently with existing sidebar elements and are clearly readable.

**Best Practices to Adhere To:**
*   Use descriptive IDs for new HTML elements.
*   Implement clear, immediate validation feedback (FR1.10).
*   Ensure the input field has sensible defaults and limits (`min`, `max`, `step`, `value`).
*   Lay the groundwork for dynamic UI updates in subsequent tasks based on this input's value.

**Expected Outcome:**
*   A new input field "Number of Torches" is present in the UI sidebar.
*   Basic validation (integer, range 0-10) is implemented, with error messages displayed for invalid input.
*   Changing the valid number of torches logs a message indicating that the UI for individual torch parameters would be updated (actual update logic deferred to next task).

Provide modifications to the relevant HTML, CSS, and JavaScript files.
```

---

### Task: User Interface & Experience: For each torch: UI input fields for 3D position (X,Y,Z) and orientation (e.g., direction vector or Euler angles) (FR1.2 part).
(Corresponds to `TODO.md` Sprint 3 Task 2)

**Prompt Text:**
```
Assistant,

Continuing with Sprint 3, the next task is to dynamically create UI input fields for each plasma torch's 3D position and orientation, based on the number of torches defined in the previous task.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Relevant Requirements:** FR1.2 (Torch Configuration: position, orientation).
*   **Prerequisite:** Sprint 3, Task 1 (UI for defining the number of torches) is complete. An input field like `<input type="number" id="number-of-torches">` exists, and its value determines N.
*   **Goal:** When the user specifies N torches, the UI should dynamically display N sets of input fields. Each set will allow the user to define the 3D position (X, Y, Z) and orientation (e.g., Yaw, Pitch, Roll Euler angles) for one torch.

**Instructions:**
1.  **Modify HTML Structure (Placeholder Container):
    *   In your main HTML file (e.g., `index.html`), ensure there's a dedicated container element where the dynamic torch parameter inputs will be injected. If not already present from a conceptual step in Task 1, add it now. This container should be located logically within the sidebar, likely after the "Number of Torches" input.
        *   Example: `<div id="torch-parameters-container"></div>`

2.  **Implement/Update JavaScript Function for Dynamic UI Generation (`updateTorchParameterUI`):
    *   In your primary JavaScript file (e.g., `main.js`), create or refine the function `updateTorchParameterUI(numTorches)`.
    *   **Clear Previous Inputs:** The function must first clear any existing content from `#torch-parameters-container` to prevent duplication when the number of torches changes.
        *   Example: `document.getElementById('torch-parameters-container').innerHTML = '';`
    *   **Loop and Generate Inputs:** Iterate from 1 to `numTorches` (or 0 to `numTorches - 1`):
        *   For each torch `i`:
            *   Create a container for the torch's inputs, e.g., a `<fieldset>` or `<div>`:
                *   `<fieldset id="torch-config-${i}">`
                *   Add a `<legend>Torch ${i} Parameters</legend>`.
            *   **Position Inputs (X, Y, Z):**
                *   Label: "Position X:"
                *   Input: `<input type="number" id="torch-${i}-pos-x" name="torch-${i}-pos-x" step="any" class="torch-input torch-position-input">`
                *   Label: "Position Y:"
                *   Input: `<input type="number" id="torch-${i}-pos-y" name="torch-${i}-pos-y" step="any" class="torch-input torch-position-input">`
                *   Label: "Position Z:"
                *   Input: `<input type="number" id="torch-${i}-pos-z" name="torch-${i}-pos-z" step="any" class="torch-input torch-position-input">`
            *   **Orientation Inputs (Euler Angles - Yaw, Pitch, Roll in degrees):**
                *   Label: "Orientation Yaw (deg):"
                *   Input: `<input type="number" id="torch-${i}-orient-yaw" name="torch-${i}-orient-yaw" step="any" min="-180" max="180" class="torch-input torch-orientation-input">`
                *   Label: "Orientation Pitch (deg):"
                *   Input: `<input type="number" id="torch-${i}-orient-pitch" name="torch-${i}-orient-pitch" step="any" min="-90" max="90" class="torch-input torch-orientation-input">`
                *   Label: "Orientation Roll (deg):"
                *   Input: `<input type="number" id="torch-${i}-orient-roll" name="torch-${i}-orient-roll" step="any" min="-180" max="180" class="torch-input torch-orientation-input">`
            *   Append the new elements (labels, inputs) into the torch's container (`fieldset`/`div`).
            *   Append the torch's container to the main `#torch-parameters-container`.

3.  **Trigger UI Update Logic:**
    *   Enhance the event listener on the `#number-of-torches` input (from Sprint 3, Task 1).
    *   When the value of `#number-of-torches` changes and is valid, call `updateTorchParameterUI(parseInt(event.target.value, 10))`.
    *   Also, call `updateTorchParameterUI` once on initial page load, using the default value of `#number-of-torches`, to display the initial set of torch inputs.
        *   Example (on load): `updateTorchParameterUI(parseInt(document.getElementById('number-of-torches').value, 10));`

4.  **Styling (CSS):
    *   In your CSS file (e.g., `style.css`), add styles for `#torch-parameters-container`, and the dynamically generated fieldsets (or divs), legends, labels, and inputs (e.g., using classes like `torch-input`, `torch-position-input`, `torch-orientation-input`).
    *   Ensure the layout is clean, organized, and usable, especially if many torches are configured. Consider using flexbox or grid for alignment within each torch's parameter set.
    *   Example styling for a fieldset:
        *   `#torch-parameters-container fieldset { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }`
        *   `#torch-parameters-container legend { font-weight: bold; }`

5.  **Basic Input Validation:**
    *   The `type="number"` and `min`/`max` attributes on inputs provide initial browser-level validation. For this task, ensure these are set appropriately (e.g., Euler angles within their typical ranges).
    *   `step="any"` allows for floating-point numbers, which is suitable for positions and orientations.

**Best Practices to Adhere To:**
*   Generate unique and descriptive `id` and `name` attributes for all dynamic input elements to facilitate data collection and future interaction.
*   Ensure JavaScript code for UI generation is clean, well-commented, and robust against potential errors (e.g., `numTorches` being non-numeric, though prior validation should handle this).
*   Prioritize a clear and uncluttered UI, even when displaying parameters for multiple torches.

**Expected Outcome:**
*   A container element (e.g., `<div id="torch-parameters-container">`) exists in the HTML to hold dynamically generated torch inputs.
*   When the user sets "Number of Torches" to N (and the input is valid), N distinct sets of input fields are dynamically created and displayed in `#torch-parameters-container`.
*   Each set includes inputs for: Position X, Y, Z; Orientation Yaw, Pitch, Roll.
*   Each set is clearly labeled (e.g., "Torch 1 Parameters", "Torch 2 Parameters", etc.).
*   The UI correctly updates (clears and regenerates) if the number of torches is changed again.
*   Basic styling is applied for good readability and organization of the new input fields.

Provide modifications to the relevant HTML, CSS, and JavaScript files.
```

---

### Task: User Interface & Experience: For each torch: UI input fields for power, flow, temperature (FR1.3). Add basic validation (FR1.10).
(Corresponds to `TODO.md` Sprint 3 Task 3)

**Prompt Text:**
```
Assistant,

For the third task in Sprint 3, we will extend the per-torch UI to include input fields for operational parameters: power, gas flow rate, and plasma temperature. We'll also implement basic client-side validation for these new inputs.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Relevant Requirements:** FR1.3 (Torch Operational Parameters), FR1.10 (Input Validation).
*   **Prerequisite:** Sprint 3, Task 2 (Dynamic UI for torch position/orientation) is complete. The JavaScript function `updateTorchParameterUI(numTorches)` dynamically creates input sections (e.g., `<fieldset id="torch-config-${i}">`) for N torches.
*   **Goal:** For each dynamically generated torch configuration section, add input fields for power (kW), gas flow rate (e.g., L/min), and plasma temperature (K or °C). Implement client-side validation to ensure these parameters are within sensible, positive ranges.

**Instructions:**
1.  **Modify JavaScript Function `updateTorchParameterUI(numTorches)`:**
    *   Locate the part of the function where you are creating the `<fieldset id="torch-config-${i}">` (or equivalent container) for each torch `i`.
    *   **Inside each torch's container, after the position and orientation inputs, add the following operational parameter inputs:**
        *   **Power Input:**
            *   Label: "Power (kW):"
            *   Input: `<input type="number" id="torch-${i}-power" name="torch-${i}-power" step="0.1" min="0" class="torch-input torch-operational-input">`
            *   Validation Message Span: `<span id="torch-${i}-power-validation-msg" class="validation-error"></span>`
        *   **Gas Flow Rate Input:**
            *   Label: "Gas Flow Rate (L/min):" (Adjust unit if project standard differs)
            *   Input: `<input type="number" id="torch-${i}-flow" name="torch-${i}-flow" step="0.1" min="0" class="torch-input torch-operational-input">`
            *   Validation Message Span: `<span id="torch-${i}-flow-validation-msg" class="validation-error"></span>`
        *   **Plasma Temperature Input:**
            *   Label: "Plasma Temperature (K):" (Choose K or °C, be consistent)
            *   Input: `<input type="number" id="torch-${i}-temp" name="torch-${i}-temp" step="10" min="0" class="torch-input torch-operational-input">`
            *   Validation Message Span: `<span id="torch-${i}-temp-validation-msg" class="validation-error"></span>`

2.  **Implement Client-Side Validation (JavaScript):**
    *   For each newly added operational parameter input (`#torch-${i}-power`, `#torch-${i}-flow`, `#torch-${i}-temp`), add event listeners (`input` or `change`).
    *   **Validation Logic:**
        *   Values must be numbers.
        *   Values must be non-negative (greater than or equal to 0, or strictly positive if appropriate for the parameter, e.g., power typically > 0 if on).
        *   You can set a reasonable `max` attribute directly in the HTML if upper bounds are known (e.g., `<input ... max="50000">` for temperature), or perform range checks in JavaScript if more complex logic is needed.
        *   If validation fails, display a clear error message in the corresponding validation message span (e.g., "Power must be a positive number.").
        *   If validation passes, clear the error message.
    *   **Example for one input (Power):**
        ```javascript
        // (Inside the loop creating inputs for torch i)
        const powerInput = document.getElementById(`torch-${i}-power`);
        const powerValidationMsg = document.getElementById(`torch-${i}-power-validation-msg`);
        powerInput.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            if (isNaN(value) || value < 0) { // Or value <= 0 if it must be strictly positive
                powerValidationMsg.textContent = 'Power must be a non-negative number.';
            } else {
                powerValidationMsg.textContent = '';
            }
        });
        ```
    *   Repeat similar validation logic for flow rate and temperature inputs, adjusting messages and specific conditions (e.g., `min` values, allowed ranges).

3.  **Styling (CSS):**
    *   In your CSS file (e.g., `style.css`):
        *   Ensure the new input fields, labels, and validation messages for operational parameters are styled consistently with existing torch inputs (e.g., using the `torch-input`, `torch-operational-input` classes).
        *   Make sure validation error messages (`.validation-error`) are noticeable (e.g., red text).
        *   Ensure proper alignment and spacing within each torch's parameter set.

**Best Practices to Adhere To:**
*   Use specific and descriptive `id` attributes for the new inputs and their validation message spans.
*   Provide clear, user-friendly validation messages (FR1.10).
*   Ensure input fields have appropriate `step` and `min` attributes to guide user input and assist validation.
*   Maintain consistency in units (e.g., always kW, always L/min, always K or °C).

**Expected Outcome:**
*   For each dynamically generated torch configuration section, input fields for Power, Gas Flow Rate, and Plasma Temperature are now present.
*   Each of these new input fields has client-side validation:
    *   Ensures numeric input.
    *   Ensures values are non-negative (or within other defined sensible ranges).
    *   Displays clear error messages next to the input field upon invalid input.
    *   Clears error messages when the input becomes valid.
*   The UI remains well-organized and readable with the additional fields.

Provide modifications to the relevant HTML, CSS, and JavaScript files.
```

---

### Task: Core Simulation & Physics: Backend data structures to store multi-torch configurations.
(Corresponds to `TODO.md` Sprint 3 Task 4)

**Prompt Text:**
```
Assistant,

The final task for Sprint 3 involves creating the backend Rust data structures necessary to store the multi-torch configurations that the user will define via the UI. This prepares the ground for actually using these configurations in the simulation physics later.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Backend Language:** Rust.
*   **Relevant Requirements:** Implicitly supports FR1.2 (Torch Configuration) and FR1.3 (Torch Operational Parameters) by providing a way to store them.
*   **Current State (Conceptual):** The frontend UI (from previous Sprint 3 tasks) allows users to define the number of torches and, for each torch, its 3D position (X, Y, Z), orientation (e.g., Yaw, Pitch, Roll), power, gas flow rate, and plasma temperature.
*   **Goal:** Define Rust structs that can accurately represent one or more plasma torches, including all their configurable parameters. These structures should be designed to be easily populated from data sent from the frontend (though the frontend-to-backend communication itself is not part of this specific task) and later used by the simulation engine.

**Instructions:**
1.  **Define Core `TorchParameters` Struct (Rust):**
    *   In a relevant Rust module (e.g., `src/simulation/config.rs`, `src/simulation/physics_models.rs`, or a new `src/simulation/torch.rs` if it makes sense for organization), define a public struct named `TorchParameters` (or a similar descriptive name).
    *   This struct should contain fields for all the parameters of a single torch. Use appropriate Rust data types.
        *   **Position:** Consider a nested struct `Point3D { x: f64, y: f64, z: f64 }` or use a tuple `(f64, f64, f64)`. Alternatively, use a vector type from a math library if one is already in use (e.g., `nalgebra::Point3<f64>`).
        *   **Orientation:** Consider a nested struct `EulerAngles { yaw: f64, pitch: f64, roll: f64 }` (store in radians if that's standard for calculations, or degrees if that's how it's input and converted later). Alternatively, a direction vector `Vector3D { dx: f64, dy: f64, dz: f64 }` might be more suitable for physics calculations later, but Euler angles are often more user-friendly for input. For now, mirroring the UI input (Euler angles) is acceptable.
        *   **Power:** `power_kw: f64`
        *   **Gas Flow Rate:** `flow_rate_l_min: f64` (ensure units are clear in the field name)
        *   **Plasma Temperature:** `temperature_k: f64` (Kelvin is standard for physics)
    *   Add `#[derive(Debug, Clone, PartialEq)]` to this struct for easier debugging and usage. If data is to be sent from JavaScript and deserialized, also add `#[derive(serde::Deserialize, serde::Serialize)]` (assuming `serde` is a project dependency for JSON communication with Tauri).

    ```rust
    // Example (choose one representation for position/orientation or make them configurable):
    // In src/simulation/torch.rs (or other appropriate file)

    // #[cfg(feature = "serde")] // Optional: if serde is used
    // use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, PartialEq /*, Deserialize, Serialize */)] // Add serde if needed
    pub struct Point3D {
        pub x: f64,
        pub y: f64,
        pub z: f64,
    }

    #[derive(Debug, Clone, PartialEq /*, Deserialize, Serialize */)] // Add serde if needed
    pub struct EulerAngles {
        pub yaw_degrees: f64,   // Or radians if preferred internally
        pub pitch_degrees: f64,
        pub roll_degrees: f64,
    }

    #[derive(Debug, Clone, PartialEq /*, Deserialize, Serialize */)] // Add serde if needed
    pub struct TorchParameters {
        pub id: usize, // To uniquely identify the torch, corresponds to i in the UI
        pub position: Point3D,
        pub orientation: EulerAngles, // Or a direction vector type
        pub power_kw: f64,
        pub flow_rate_l_min: f64,
        pub temperature_k: f64,
        // pub is_enabled: bool, // Consider adding this later if torches can be individually toggled
    }
    ```

2.  **Define `SimulationConfiguration` or Update Existing Configuration Struct (Rust):**
    *   The main simulation configuration struct (e.g., often found in `src/simulation/config.rs` or `src/main.rs` if simple, or a dedicated `SimulationConfig` struct) needs a way to hold multiple `TorchParameters`.
    *   Add a field to this main configuration struct, for example: `pub torches: Vec<TorchParameters>,`.
    *   If you're using `serde`, ensure this main configuration struct also derives `Deserialize` and `Serialize` if it's meant to be fully (de)serializable.

    ```rust
    // Example: Modifying an existing SimulationConfig struct
    // In src/simulation/config.rs (or similar)

    // use super::torch::TorchParameters; // If TorchParameters is in a submodule

    #[derive(Debug, Clone, PartialEq /*, Deserialize, Serialize */)] // Add serde if needed
    pub struct SimulationConfig {
        // ... other existing configuration fields like furnace_height, furnace_diameter ...
        pub number_of_torches: usize, // This might mirror the UI input directly
        pub torches: Vec<TorchParameters>,
        // ... other fields ...
    }

    impl SimulationConfig {
        pub fn new() -> Self {
            // Default initialization
            SimulationConfig {
                // ... initialize other fields ...
                number_of_torches: 1, // Default to 1 torch
                torches: vec![], // Initially empty, to be populated based on UI input
            }
        }
        // Potentially add a method to update torches based on frontend data
        // pub fn update_torch_configurations(&mut self, torch_data_from_frontend: Vec<TorchParameters>) {
        //     self.torches = torch_data_from_frontend;
        //     self.number_of_torches = self.torches.len();
        // }
    }
    ```

3.  **Module Organization (Rust):**
    *   If you created a new `torch.rs` file, ensure it's correctly declared in its parent module (e.g., `src/simulation/mod.rs` would have `pub mod torch;` and then other files could use `use super::torch::TorchParameters;` or `use crate::simulation::torch::TorchParameters;`).

**Best Practices to Adhere To:**
*   Use clear, descriptive names for structs and fields.
*   Employ appropriate Rust data types (`f64` for floating-point physics parameters, `usize` for counts/indices).
*   Consider unit consistency (e.g., always store angles in radians internally if that's what math functions expect, even if input is degrees; or be explicit with field names like `yaw_degrees`). For this task, matching UI units (degrees for Euler angles) is acceptable, conversion can happen later.
*   Add `#[derive(Debug, Clone, PartialEq)]` for utility. Add `serde` derives if JSON serialization/deserialization with the frontend is planned for the near future.
*   Organize code into logical modules.

**Expected Outcome:**
*   New Rust struct(s) (e.g., `TorchParameters`, `Point3D`, `EulerAngles`) are defined to hold the configuration for a single plasma torch.
*   The main simulation configuration struct (e.g., `SimulationConfig`) is updated to include a collection (e.g., `Vec<TorchParameters>`) to store configurations for all active torches.
*   The new/updated structs compile successfully as part of the Rust backend.
*   (Optional, if `serde` is used) The structs can be (de)serialized if `serde` derives are added.

Provide modifications to the relevant Rust files (e.g., `src/simulation/config.rs`, potentially creating `src/simulation/torch.rs` and updating `src/simulation/mod.rs`).
```

---
