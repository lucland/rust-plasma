## Sprint 4: Material Properties & Boundary Conditions Input

### Task: User Interface & Experience: UI for initial material properties: composition (text input), density, water content (numeric inputs) (FR1.4). Basic validation (FR1.10).
(Corresponds to `TODO.md` Sprint 4 Task 1)

**Prompt Text:**
```
Assistant,

We are commencing Sprint 4, which focuses on enabling user input for material properties and boundary conditions. This first task involves creating the UI elements for initial material properties.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Backend Language:** Rust.
*   **Relevant Requirements:** FR1.4 (Material Properties Input: composition, density, water content), FR1.10 (Input Validation), FR6.1 (Intuitive Parameter Input).
*   **Current UI State:** The UI sidebar (`<div id="sidebar-controls">`) contains inputs for furnace geometry (Sprint 1) and torch configuration (Sprint 3).
*   **Goal:** Add new UI input fields to the sidebar for specifying initial material properties: composition (as a text input), density (numeric), and water content (numeric, percentage). Implement basic client-side validation for these inputs.

**Instructions:**

1.  **Locate Control Area (HTML - e.g., `index.html`):**
    *   Find the sidebar section (`<div id="sidebar-controls">`).
    *   Add a new clearly demarcated section/group, perhaps titled "Material Properties".

2.  **Add Material Properties Input Fields (HTML):**
    *   **Composition:**
        *   Label: "Material Composition:"
        *   Input: `<input type="text" id="material-composition" name="material-composition" placeholder="e.g., Cellulose, Lignin mix">`
        *   Validation Message Span: `<span id="composition-validation-msg" class="validation-error"></span>`
    *   **Density:**
        *   Label: "Density (kg/m³):"
        *   Input: `<input type="number" id="material-density" name="material-density" min="0" step="any" placeholder="e.g., 500">`
        *   Validation Message Span: `<span id="density-validation-msg" class="validation-error"></span>`
    *   **Water Content:**
        *   Label: "Water Content (%):"
        *   Input: `<input type="number" id="material-water-content" name="material-water-content" min="0" max="100" step="any" placeholder="e.g., 10">`
        *   Validation Message Span: `<span id="water-content-validation-msg" class="validation-error"></span>`

3.  **Implement Client-Side Validation (JavaScript - e.g., `main.js`):**
    *   For each new input field (`#material-composition`, `#material-density`, `#material-water-content`):
        *   Add an `input` event listener.
        *   **Composition Validation:**
            *   Ensure the input is not empty (or apply other relevant string validation if needed, for now, not-empty is sufficient).
            *   Display message in `#composition-validation-msg`.
        *   **Density Validation:**
            *   Ensure the value is a positive number.
            *   Display message in `#density-validation-msg`.
        *   **Water Content Validation:**
            *   Ensure the value is a number between 0 and 100 (inclusive).
            *   Display message in `#water-content-validation-msg`.
    *   Clear validation messages when input becomes valid.
    *   When all material property inputs are valid, you can log the collective data to the console, e.g., `console.log("Material properties updated:", { composition: '...', density: ..., waterContent: ... });`. This data will be sent to the backend in a later task.

4.  **Styling (CSS - e.g., `style.css`):**
    *   Ensure the new labels, input fields, and validation messages are styled consistently with existing sidebar elements.
    *   Maintain clear readability and usability.
    *   The "Material Properties" section should be visually distinct but cohesive with other sidebar sections.

**Best Practices to Adhere To:**
*   Use descriptive and consistent IDs for all new HTML elements.
*   Provide immediate and clear validation feedback to the user (FR1.10).
*   Utilize appropriate HTML5 input types and attributes (`type="number"`, `min`, `max`, `step`, `placeholder`).
*   Structure JavaScript for clarity and maintainability, associating event listeners appropriately.
*   Ensure CSS rules are specific enough to target new elements without unintended side effects.

**Expected Outcome:**
*   New input fields for "Material Composition", "Density", and "Water Content" are present and functional in the UI sidebar.
*   Client-side validation (non-empty for composition, positive number for density, 0-100 for water content) is implemented with appropriate error messages.
*   Valid inputs result in data being logged to the console (as a placeholder for future backend integration).
*   The new UI section is well-styled and integrated into the existing sidebar layout.

Provide modifications to the relevant HTML, CSS, and JavaScript files.

---

### Task: User Interface & Experience: UI for basic boundary conditions: e.g., toggle for "Adiabatic Walls" (FR1.5 part).
(Corresponds to `TODO.md` Sprint 4 Task 2)

**Prompt Text:**
```
Assistant,

Continuing with Sprint 4, this task focuses on adding UI elements for basic boundary conditions, specifically a toggle for "Adiabatic Walls".

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Backend Language:** Rust.
*   **Relevant Requirements:** FR1.5 (Boundary Conditions: ability to define basic boundary conditions, "Adiabatic Walls" is a key example), FR6.1 (Intuitive Parameter Input).
*   **Current UI State:** The UI sidebar (`<div id="sidebar-controls">`) includes inputs for furnace geometry, torch configuration, and (from the previous task) material properties.
*   **Goal:** Implement a UI toggle (e.g., a checkbox) within the sidebar to allow the user to specify if the furnace walls should be treated as adiabatic.

**Instructions:**

1.  **Locate Control Area (HTML - e.g., `index.html`):**
    *   Find the sidebar section (`<div id="sidebar-controls">`).
    *   Add a new section or group, perhaps titled "Boundary Conditions", or append to an existing relevant section like "Material Properties" if it makes sense organizationally. For now, let's assume a new small section "Boundary Conditions".

2.  **Add Adiabatic Walls Toggle (HTML):**
    *   **Checkbox Input:**
        *   Label: "Adiabatic Walls:"
        *   Input: `<input type="checkbox" id="adiabatic-walls-toggle" name="adiabatic-walls-toggle" checked>` (Default to checked, assuming adiabatic is a common starting point or simplify initial state).

3.  **Handle Toggle State Change (JavaScript - e.g., `main.js`):**
    *   Add an event listener (`change`) to the `#adiabatic-walls-toggle` checkbox.
    *   When the checkbox state changes, log the new state (true/false) to the console, e.g., `console.log("Adiabatic Walls toggled to: " + document.getElementById('adiabatic-walls-toggle').checked);`.
    *   This state will be sent to the backend in the subsequent task of this sprint.

4.  **Styling (CSS - e.g., `style.css`):**
    *   Ensure the new label and checkbox are styled consistently with other sidebar elements.
    *   The layout should be clean and the toggle easily identifiable and usable.

**Best Practices to Adhere To:**
*   Use a descriptive ID for the new HTML element (`#adiabatic-walls-toggle`).
*   Ensure the default state of the toggle is sensible for typical use cases or initial setup simplicity.
*   JavaScript for handling the state change should be straightforward and clearly log the current state for now.
*   CSS should maintain visual consistency within the sidebar.

**Expected Outcome:**
*   A new checkbox labeled "Adiabatic Walls:" is present and functional in the UI sidebar.
*   The checkbox is checked by default.
*   Toggling the checkbox logs its new state (true/false) to the browser console.
*   The new UI element is well-styled and integrated into the sidebar.

Provide modifications to the relevant HTML, CSS, and JavaScript files.

---

### Task: Core Simulation & Physics: Backend to store these settings.
(Corresponds to `TODO.md` Sprint 4 Task 3)

**Prompt Text:**
```
Assistant,

This task concludes the initial setup for material properties and boundary conditions in Sprint 4 by implementing the backend logic to receive and store these settings. The UI elements were created in the previous two tasks.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **UI Framework:** Tauri (HTML, CSS, JavaScript for frontend).
*   **Backend Language:** Rust.
*   **Relevant Requirements:** FR1.4, FR1.5 (Storing material and boundary condition settings).
*   **Current State:** 
    *   UI inputs exist for material composition, density, water content, and an 'Adiabatic Walls' toggle.
    *   JavaScript currently logs these values to the console upon change.
*   **Goal:** 
    1.  Define Rust structs to hold the material properties and boundary conditions.
    2.  Create a Tauri command that the frontend can invoke to send these settings to the Rust backend.
    3.  Update the JavaScript to call this Tauri command when the settings are confirmed or when a 'Save Settings' button (if we decide to add one later, for now, on change is fine) is clicked.

**Instructions:**

1.  **Define Rust Data Structures (e.g., in `src/main.rs` or a new `src/config_models.rs` or similar):**
    *   Create a struct for `MaterialProperties`:
        ```rust
        use serde::{Serialize, Deserialize};

        #[derive(Debug, Serialize, Deserialize, Clone, Default)]
        pub struct MaterialProperties {
            pub composition: String,
            pub density: f64, // kg/m³
            pub water_content: f64, // Percentage, 0.0 to 100.0
        }
        ```
    *   Create a struct for `BoundaryConditions`:
        ```rust
        #[derive(Debug, Serialize, Deserialize, Clone, Default)]
        pub struct BoundaryConditions {
            pub adiabatic_walls: bool,
        }
        ```
    *   Optionally, create a higher-level struct `SimulationParameters` or `CurrentSettings` that might hold these and other future settings, or manage them in an `AppState`.
        ```rust
        // Example if using a single AppState to hold them
        // #[derive(Debug, Default)]
        // pub struct AppState {
        //     material_properties: MaterialProperties,
        //     boundary_conditions: BoundaryConditions,
        //     // ... other future states like torch_configurations
        // }
        ```
        For now, let's manage them in a shared state managed by Tauri. We'll need a `Mutex` for interior mutability if storing in `AppState`.

2.  **Implement Tauri Command (e.g., in `src/main.rs`):**
    *   Define a new Tauri command, e.g., `update_material_and_boundary_settings`.
    *   This command should accept `MaterialProperties` and `BoundaryConditions` as arguments from the frontend.
        ```rust
        use tauri::State;
        use std::sync::Mutex;

        // Assume these structs are defined as above

        // If managing state directly in Tauri's managed state:
        // Define state wrappers
        pub struct AppMaterialProperties(pub Mutex<MaterialProperties>);
        pub struct AppBoundaryConditions(pub Mutex<BoundaryConditions>);

        #[tauri::command]
        fn update_material_and_boundary_settings(
            material_props: MaterialProperties, 
            boundary_conds: BoundaryConditions,
            mat_props_state: State<AppMaterialProperties>,
            bound_conds_state: State<AppBoundaryConditions>
        ) -> Result<(), String> {
            println!("Backend received material properties: {:?}", material_props);
            println!("Backend received boundary conditions: {:?}", boundary_conds);

            // Store them in the managed state
            *mat_props_state.0.lock().unwrap() = material_props;
            *bound_conds_state.0.lock().unwrap() = boundary_conds;
            
            // In a real scenario, you might perform further validation or processing here.
            Ok(())
        }
        ```
    *   Ensure this command is added to the `.invoke_handler(tauri::generate_handler![...])` in your `main` function.
    *   Also, add `AppMaterialProperties` and `AppBoundaryConditions` to Tauri's managed state using `.manage()`:
        ```rust
        // In main()
        .manage(AppMaterialProperties(Default::default()))
        .manage(AppBoundaryConditions(Default::default()))
        // ... before .invoke_handler
        ```

3.  **Update Frontend JavaScript (e.g., `main.js`):**
    *   Modify the event listeners for the material property inputs and the adiabatic walls toggle.
    *   When inputs change and are valid (or perhaps on a dedicated 'Apply Settings' button click if preferred for UX later), gather all the current values:
        *   Material Composition (string)
        *   Density (float/number)
        *   Water Content (float/number)
        *   Adiabatic Walls (boolean)
    *   Invoke the new Tauri command with these values. Example using `invoke`:
        ```javascript
        // Assuming you have a function that gathers and validates data
        async function sendSettingsToBackend() {
            const { invoke } = window.__TAURI__.tauri;

            // Gather values from HTML inputs
            const composition = document.getElementById('material-composition').value;
            const density = parseFloat(document.getElementById('material-density').value);
            const waterContent = parseFloat(document.getElementById('material-water-content').value);
            const adiabaticWalls = document.getElementById('adiabatic-walls-toggle').checked;

            // Basic validation check on frontend before sending (can be more robust)
            if (isNaN(density) || isNaN(waterContent) || composition.trim() === '') {
                console.error('Invalid data, not sending to backend.');
                // Optionally, display a general error message to the user
                return;
            }

            const materialProps = {
                composition: composition,
                density: density,
                water_content: waterContent // Ensure snake_case matches Rust struct fields
            };

            const boundaryConds = {
                adiabatic_walls: adiabaticWalls // Ensure snake_case matches Rust struct fields
            };

            try {
                await invoke('update_material_and_boundary_settings', {
                    materialProps: materialProps, 
                    boundaryConds: boundaryConds 
                });
                console.log('Material and boundary settings sent to backend successfully.');
            } catch (error) {
                console.error('Failed to send settings to backend:', error);
                // Display error to user
            }
        }

        // Example: Call sendSettingsToBackend() when a relevant input changes and is valid.
        // You might want to debounce this or call it from a specific "Apply" button.
        // For now, let's assume it's called after all validations pass for simplicity.
        // Attach to 'change' or 'input' events of your form elements, then call sendSettingsToBackend.
        // e.g., document.getElementById('material-density').addEventListener('input', () => { /* validate then */ sendSettingsToBackend(); }); 
        // Consider a single function that validates all related fields and then calls sendSettingsToBackend.
        ```

**Best Practices to Adhere To:**
*   **Data Structures:** Define clear, serializable (Serde) Rust structs for your data. Use `Option<T>` for fields that might not always be provided, though for this task, all fields are expected.
*   **State Management:** Use Tauri's state management (`.manage()`) for shared data accessible by commands. Use `Mutex` for safe interior mutability.
*   **Error Handling:** The Tauri command should return a `Result` to indicate success or failure to the frontend.
*   **Frontend-Backend Contract:** Ensure field names in JavaScript objects match the Rust struct field names (e.g., `water_content` in JS for `water_content: f64` in Rust).
*   **Idempotency (Optional but good):** Design commands so that calling them multiple times with the same data has the same effect (though not strictly critical here).
*   **Logging:** Log received data on the backend (e.g., using `println!` or a proper logger) for debugging purposes.

**Expected Outcome:**
*   Rust structs `MaterialProperties` and `BoundaryConditions` are defined.
*   A Tauri command `update_material_and_boundary_settings` is implemented and callable from the frontend.
*   Relevant application state for these settings is managed by Tauri.
*   JavaScript is updated to call this command, passing the current material and boundary condition settings from the UI.
*   The Rust backend logs the received data, confirming successful communication.

Provide modifications to `src/main.rs` (or new Rust files as appropriate) and the main JavaScript file.

---

### Task: QA Objective: Input material properties and set boundary condition toggles. Verify UI validation and backend data storage (debug/log).
(Corresponds to `TODO.md` Sprint 4 Task 4)

**Prompt Text:**
```
Assistant,

This task is the Quality Assurance (QA) objective for Sprint 4. It involves testing the features implemented in the previous three tasks: UI for material properties, UI for the adiabatic walls boundary condition, and the backend integration for storing these settings.

**Context:**
*   **Project Name:** Plasma Furnace Simulator
*   **Features to Test:**
    1.  UI input fields for material properties (composition, density, water content) with client-side validation.
    2.  UI toggle for "Adiabatic Walls" boundary condition.
    3.  Backend Rust structs and Tauri command (`update_material_and_boundary_settings`) to receive and store these settings.
    4.  Tauri state management for storing the received data on the backend.
*   **Goal:** Systematically test the implemented features to ensure they function as expected, validation works correctly, and data is successfully communicated to and stored by the backend (verifiable via console logs and backend `println!` statements).

**QA Steps & Verification:**

1.  **Launch the Application:**
    *   Ensure the application builds and launches without errors.

2.  **Test Material Properties UI & Validation:**
    *   **Composition Input (`#material-composition`):**
        *   **Valid Input:** Enter a typical string (e.g., "Wood Chips"). Verify no validation error is shown.
        *   **Invalid Input (Empty):** Clear the input. Verify a validation message (e.g., "Composition cannot be empty.") appears next to the field.
    *   **Density Input (`#material-density`):**
        *   **Valid Input:** Enter a positive number (e.g., `600`). Verify no validation error.
        *   **Invalid Input (Negative):** Enter `-100`. Verify a validation message (e.g., "Density must be a positive number.") appears.
        *   **Invalid Input (Zero):** Enter `0`. Verify validation message (if 0 is disallowed, otherwise it might be valid depending on exact rules set).
        *   **Invalid Input (Non-numeric):** Enter `abc`. Verify a validation message (e.g., "Density must be a number.") appears or the input field inherently prevents non-numeric characters (depending on `type="number"` behavior and JS validation).
    *   **Water Content Input (`#material-water-content`):**
        *   **Valid Input:** Enter a number between 0 and 100 (e.g., `15.5`). Verify no validation error.
        *   **Invalid Input (Negative):** Enter `-5`. Verify validation message (e.g., "Water content must be between 0 and 100.").
        *   **Invalid Input (Above 100):** Enter `110`. Verify validation message.
        *   **Invalid Input (Non-numeric):** Enter `xyz`. Verify validation message or field behavior.

3.  **Test Adiabatic Walls Toggle (`#adiabatic-walls-toggle`):**
    *   **Initial State:** Verify the checkbox is checked by default (as per implementation).
    *   **Toggle Off:** Uncheck the checkbox. Observe the browser console for a log message like `"Adiabatic Walls toggled to: false"` (or similar, based on actual JS logging).
    *   **Toggle On:** Check the checkbox again. Observe the browser console for a log message like `"Adiabatic Walls toggled to: true"`.

4.  **Test Backend Data Submission & Storage:**
    *   **Scenario 1: All Valid Inputs**
        *   Enter valid data into all material property fields (e.g., Composition: "Pine Wood", Density: 700, Water Content: 12).
        *   Leave "Adiabatic Walls" checked (or uncheck and recheck to ensure its state is captured).
        *   Trigger the `sendSettingsToBackend()` JavaScript function (this might happen on input change, or if you implemented a temporary button, click that).
        *   **Verification (Frontend):** Check the browser console for a success message like `"Material and boundary settings sent to backend successfully."`. No frontend validation errors should be visible.
        *   **Verification (Backend):** Check the Rust application's console output (where `println!` statements go). You should see logs similar to:
            *   `Backend received material properties: MaterialProperties { composition: "Pine Wood", density: 700.0, water_content: 12.0 }`
            *   `Backend received boundary conditions: BoundaryConditions { adiabatic_walls: true }` (or `false` if you unchecked it).
    *   **Scenario 2: Attempt to Submit with Invalid Material Data**
        *   Enter an invalid value in one of the material fields (e.g., negative density).
        *   Try to trigger the submission (if it's automatic on change and an input is invalid, the JS `sendSettingsToBackend` function's internal check should prevent the `invoke` call).
        *   **Verification (Frontend):** The frontend validation message for the invalid field should be visible. The browser console might show an error like `"Invalid data, not sending to backend."`. The Tauri `invoke` call should NOT have been made for `update_material_and_boundary_settings` in this case.
        *   **Verification (Backend):** No new "Backend received..." logs should appear in the Rust console for this specific invalid attempt.

5.  **Overall UI/UX:**
    *   Ensure all new UI elements in the "Material Properties" and "Boundary Conditions" sections are visually consistent with the rest of the sidebar.
    *   Check for any layout issues or styling inconsistencies.

**Best Practices for QA Execution:**
*   Test systematically, one feature/validation case at a time.
*   Clear browser console and Rust console logs between distinct test scenarios if necessary to avoid confusion.
*   Document any deviations from expected behavior, including the steps to reproduce them.
*   Pay attention to both positive (valid input) and negative (invalid input) test cases.

**Expected Outcome:**
*   All UI validation rules for material properties function correctly, displaying appropriate messages.
*   The adiabatic walls toggle updates its state correctly, and this is logged.
*   Valid data for material properties and boundary conditions is successfully sent to the Rust backend via the Tauri command.
*   The Rust backend correctly receives, deserializes, and logs the data, and stores it in the managed Tauri state (verified by the `println!` logs showing the structs' contents).
*   Attempts to send invalid data from the frontend are caught by client-side validation, preventing calls to the backend with malformed data.
*   The application remains stable throughout testing.

This QA task does not require code changes but rather a thorough execution of test steps and verification of outputs.
