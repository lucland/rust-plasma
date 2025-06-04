//-----------------------------------------------------------------------------
// File: simulation/solver.rs
// Main Responsibility: Numerical solution of the heat transfer equations.
//
// This file contains the core numerical algorithms for solving the heat transfer
// equations. It implements an enthalpy-based method that handles phase changes,
// uses the Crank-Nicolson method for time integration, and solves the resulting
// system of equations. This component is the mathematical heart of the simulation
// engine, responsible for accurately calculating temperature distributions and
// phase transitions over time.
//-----------------------------------------------------------------------------

// Integração do módulo de materiais com o solucionador

use ndarray::{Array, Array2, Array3, Axis, s, Zip};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use log::{info, warn, error};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

use super::mesh::CylindricalMesh;
use super::physics::{PlasmaTorch, HeatSources, calculate_radiation_source, calculate_convection_source};
use super::materials::{MaterialProperties, MaterialLibrary};

/// Estrutura que representa os parâmetros da simulação com suporte a materiais avançados
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationParameters {
    /// Altura do cilindro (m)
    pub height: f64,
    /// Raio do cilindro (m)
    pub radius: f64,
    /// Número de nós na direção radial
    pub nr: usize,
    /// Número de nós na direção axial
    pub nz: usize,
    /// Número de nós na direção angular (para visualização 3D)
    pub ntheta: usize,
    /// Tochas de plasma
    pub torches: Vec<PlasmaTorch>,
    /// Propriedades do material
    pub material: MaterialProperties,
    /// Mapa de materiais para diferentes zonas (opcional)
    pub material_zones: Option<Vec<(String, MaterialProperties)>>,
    /// Temperatura inicial (°C)
    pub initial_temperature: f64,
    /// Temperatura ambiente (°C)
    pub ambient_temperature: f64,
    /// Coeficiente de convecção (W/(m²·K))
    pub convection_coefficient: f64,
    /// Habilitar convecção
    pub enable_convection: bool,
    /// Habilitar radiação
    pub enable_radiation: bool,
    /// Habilitar mudanças de fase
    pub enable_phase_changes: bool,
    /// Tempo total de simulação (s)
    pub total_time: f64,
    /// Passo de tempo (s)
    pub time_step: f64,
    /// Número de passos de tempo
    pub time_steps: usize,
    /// Mapa de zonas (opcional)
    pub zone_map: Option<Array2<usize>>,
}

impl SimulationParameters {
    /// Cria uma nova instância de parâmetros de simulação com valores padrão
    pub fn new(height: f64, radius: f64, nr: usize, nz: usize) -> Self {
        // Criar biblioteca de materiais
        let library = MaterialLibrary::new();
        
        // Usar aço como material padrão
        let default_material = library.get_material_clone("steel")
            .unwrap_or_else(|| MaterialProperties::new("Default Material", 7850.0, 490.0, 45.0));
        
        Self {
            height,
            radius,
            nr,
            nz,
            ntheta: 12, // Valor padrão para visualização 3D
            torches: Vec::new(),
            material: default_material,
            material_zones: None,
            initial_temperature: 25.0,
            ambient_temperature: 25.0,
            convection_coefficient: 10.0,
            enable_convection: true,
            enable_radiation: true,
            enable_phase_changes: true,
            total_time: 100.0,
            time_step: 1.0,
            time_steps: 100,
            zone_map: None,
        }
    }

    /// Adiciona uma tocha de plasma à simulação
    pub fn add_torch(&mut self, torch: PlasmaTorch) {
        self.torches.push(torch);
    }

    /// Remove uma tocha de plasma da simulação pelo ID
    pub fn remove_torch(&mut self, torch_id: &str) -> bool {
        let initial_len = self.torches.len();
        self.torches.retain(|t| t.id != torch_id);
        self.torches.len() < initial_len
    }

    /// Define o material principal
    pub fn set_material(&mut self, material: MaterialProperties) {
        self.material = material;
    }

    /// Adiciona uma zona de material
    pub fn add_material_zone(&mut self, zone_id: String, material: MaterialProperties) {
        if self.material_zones.is_none() {
            self.material_zones = Some(Vec::new());
        }
        
        if let Some(zones) = &mut self.material_zones {
            // Verificar se a zona já existe
            for (i, (id, _)) in zones.iter().enumerate() {
                if id == &zone_id {
                    // Atualizar material existente
                    zones[i] = (zone_id, material);
                    return;
                }
            }
            
            // Adicionar nova zona
            zones.push((zone_id, material));
        }
    }

    /// Remove uma zona de material
    pub fn remove_material_zone(&mut self, zone_id: &str) -> bool {
        if let Some(zones) = &mut self.material_zones {
            let initial_len = zones.len();
            zones.retain(|(id, _)| id != zone_id);
            return zones.len() < initial_len;
        }
        false
    }

    /// Define o mapa de zonas para diferentes materiais ou condições
    pub fn set_zone_map(&mut self, zone_map: Array2<usize>) {
        assert_eq!(zone_map.shape(), &[self.nr, self.nz], "Dimensões do mapa de zonas devem corresponder à malha");
        self.zone_map = Some(zone_map);
    }

    /// Valida os parâmetros da simulação
    pub fn validate(&self) -> Result<(), String> {
        if self.height <= 0.0 {
            return Err("Altura deve ser positiva".to_string());
        }
        if self.radius <= 0.0 {
            return Err("Raio deve ser positivo".to_string());
        }
        if self.nr < 2 {
            return Err("Número de nós radiais deve ser pelo menos 2".to_string());
        }
        if self.nz < 2 {
            return Err("Número de nós axiais deve ser pelo menos 2".to_string());
        }
        if self.ntheta < 4 {
            return Err("Número de nós angulares deve ser pelo menos 4".to_string());
        }
        if self.torches.is_empty() {
            return Err("Pelo menos uma tocha deve ser definida".to_string());
        }
        if self.time_step <= 0.0 {
            return Err("Passo de tempo deve ser positivo".to_string());
        }
        if self.total_time <= 0.0 {
            return Err("Tempo total deve ser positivo".to_string());
        }
        
        // Validar posição das tochas
        for torch in &self.torches {
            if torch.r_position < 0.0 || torch.r_position > self.radius {
                return Err(format!("Posição radial da tocha {} ({}) fora dos limites [0, {}]", 
                                  torch.id, torch.r_position, self.radius));
            }
            if torch.z_position < 0.0 || torch.z_position > self.height {
                return Err(format!("Posição axial da tocha {} ({}) fora dos limites [0, {}]", 
                                  torch.id, torch.z_position, self.height));
            }
        }
        
        // Verificar IDs duplicados de tochas
        let mut torch_ids = Vec::new();
        for torch in &self.torches {
            if torch_ids.contains(&torch.id) {
                return Err(format!("ID de tocha duplicado: {}", torch.id));
            }
            torch_ids.push(torch.id.clone());
        }
        
        // Verificar zonas de material
        if let Some(zone_map) = &self.zone_map {
            if let Some(material_zones) = &self.material_zones {
                // Verificar se todas as zonas no mapa têm um material correspondente
                let max_zone = zone_map.iter().max().unwrap_or(&0);
                if *max_zone >= material_zones.len() {
                    return Err(format!("Zona de material {} não definida", max_zone));
                }
            } else if zone_map.iter().any(|&z| z > 0) {
                return Err("Mapa de zonas definido, mas nenhuma zona de material configurada".to_string());
            }
        }
        
        Ok(())
    }
}

/// Estrutura que representa os resultados da simulação com suporte a materiais avançados
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResults {
    /// Parâmetros da simulação
    pub parameters: SimulationParameters,
    /// Malha cilíndrica
    pub mesh: CylindricalMesh,
    /// Campo de temperatura (nr, nz, time_steps) - ou até o passo que foi executado
    pub temperature: Array3<f64>,
    /// Campo de entalpia (nr, nz, time_steps) - ou até o passo que foi executado
    pub enthalpy: Array3<f64>,
    /// Tempo de execução (s)
    pub execution_time: f64,
    /// Informações sobre mudanças de fase (opcional)
    pub phase_change_info: Option<PhaseChangeInfo>,
    /// Número de passos de tempo efetivamente executados
    pub executed_steps: usize,
}

/// Estrutura que armazena informações sobre mudanças de fase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhaseChangeInfo {
    /// Fração de material fundido em cada célula (nr, nz, time_steps)
    pub melt_fraction: Option<Array3<f64>>,
    /// Fração de material vaporizado em cada célula (nr, nz, time_steps)
    pub vapor_fraction: Option<Array3<f64>>,
}

impl SimulationResults {
    /// Gera dados de temperatura 3D para um passo de tempo específico
    pub fn generate_3d_temperature(&self, time_step: usize) -> Result<Array3<f64>, String> {
        if time_step > self.executed_steps {
             return Err(format!("Passo de tempo {} fora dos limites [0, {}] executados",
                               time_step, self.executed_steps));
        }

        let nr = self.parameters.nr;
        let nz = self.parameters.nz;
        let ntheta = self.parameters.ntheta;

        let mut temp_3d = Array3::<f64>::zeros((nr, ntheta, nz));

        let temp_2d = self.temperature.slice(s![.., .., time_step]);

        for i in 0..nr {
            for k in 0..ntheta {
                for j in 0..nz {
                    temp_3d[[i, k, j]] = temp_2d[[i, j]];
                }
            }
        }

        Ok(temp_3d)
    }
}

/// Estrutura que representa o solucionador da equação de calor com suporte a materiais avançados
pub struct HeatSolver {
    /// Parâmetros da simulação
    params: SimulationParameters,
    /// Malha cilíndrica
    mesh: CylindricalMesh,
    /// Campo de temperatura atual (derivado da entalpia)
    temperature: Array2<f64>,
    /// Histórico de temperatura
    temperature_history: Array3<f64>,
    /// Campo de entalpia específica (J/kg) atual - Variável primária
    enthalpy: Array2<f64>,
    /// Histórico de entalpia específica
    enthalpy_history: Array3<f64>,
    /// Fração de material fundido em cada célula (derivado da entalpia)
    melt_fraction: Option<Array2<f64>>,
    /// Histórico de fração fundida
    melt_fraction_history: Option<Array3<f64>>,
    /// Fração de material vaporizado em cada célula (derivado da entalpia)
    vapor_fraction: Option<Array2<f64>>,
    /// Histórico de fração vaporizada
    vapor_fraction_history: Option<Array3<f64>>,
    /// Passo de tempo atual
    current_step: usize,
    /// Biblioteca de materiais (para acesso fácil às propriedades)
    material_library: MaterialLibrary,
}

impl HeatSolver {
    /// Cria um novo solucionador com os parâmetros especificados
    pub fn new(params: SimulationParameters) -> Result<Self, String> {
        // Validar parâmetros
        params.validate()?;
        
        // Criar malha
        let mesh = CylindricalMesh::new(
            params.height, 
            params.radius, 
            params.nr, 
            params.nz, 
            params.ntheta
        );
        
        // Inicializar campo de temperatura (será sobrescrito pelo cálculo da entalpia)
        let mut temperature = Array2::<f64>::from_elem((params.nr, params.nz), params.initial_temperature);
        
        // Inicializar histórico de temperatura
        let mut temperature_history = Array3::<f64>::zeros((params.nr, params.nz, params.time_steps + 1));
        
        // Inicializar campos de entalpia
        let mut enthalpy = Array2::<f64>::zeros((params.nr, params.nz));
        let mut enthalpy_history = Array3::<f64>::zeros((params.nr, params.nz, params.time_steps + 1));
        
        // Inicializar arrays de mudança de fase se necessário
        let (mut melt_fraction, mut melt_fraction_history, mut vapor_fraction, mut vapor_fraction_history) = 
            if params.enable_phase_changes && 
               (params.material.melting_point.is_some() || params.material.vaporization_point.is_some()) {
                
                let mut melt_fraction = Array2::<f64>::zeros((params.nr, params.nz));
                let melt_fraction_history = Array3::<f64>::zeros((params.nr, params.nz, params.time_steps + 1));
                
                let mut vapor_fraction = Array2::<f64>::zeros((params.nr, params.nz));
                let vapor_fraction_history = Array3::<f64>::zeros((params.nr, params.nz, params.time_steps + 1));
                
                if let Some(tm) = params.material.melting_point {
                    if params.initial_temperature >= tm {
                        melt_fraction.fill(1.0);
                        if let Some(tv) = params.material.vaporization_point {
                             if params.initial_temperature >= tv {
                                vapor_fraction.fill(1.0);
                             }
                        }
                    }
                }

                (Some(melt_fraction), Some(melt_fraction_history), 
                 Some(vapor_fraction), Some(vapor_fraction_history))
            } else {
                (None, None, None, None)
            };
        
        // Criar biblioteca de materiais para uso interno
        let material_library = MaterialLibrary::new();
        
        // Calcular entalpia inicial a partir da temperatura inicial
        let initial_melt_fraction = melt_fraction.as_ref().cloned().unwrap_or_else(|| Array2::zeros((params.nr, params.nz)));
        let initial_vapor_fraction = vapor_fraction.as_ref().cloned().unwrap_or_else(|| Array2::zeros((params.nr, params.nz)));

        Zip::from(&mut enthalpy)
            .and(&initial_melt_fraction)
            .and(&initial_vapor_fraction)
            .par_for_each(|h, &mf, &vf| {
                *h = calculate_enthalpy_from_temperature(
                    params.initial_temperature,
                    mf,
                    vf,
                    &params.material,
                    0.0
                );
            });

        Zip::from(&mut temperature)
            .and(&enthalpy)
            .par_for_each(|t, &h| {
                let (temp, _, _) = calculate_temperature_and_fractions(h, &params.material, 0.0);
                *t = temp;
            });

        // Armazenar estado inicial no histórico
        temperature_history.slice_mut(s![.., .., 0]).assign(&temperature);
        enthalpy_history.slice_mut(s![.., .., 0]).assign(&enthalpy);
         if let Some(mf_hist) = melt_fraction_history.as_mut() {
             if let Some(mf) = melt_fraction.as_ref() {
                 mf_hist.slice_mut(s![.., .., 0]).assign(mf);
             }
         }
         if let Some(vf_hist) = vapor_fraction_history.as_mut() {
            if let Some(vf) = vapor_fraction.as_ref() {
                vf_hist.slice_mut(s![.., .., 0]).assign(vf);
            }
        }

        // Configurar mapa de zonas, se fornecido
        let mut solver = Self {
            params,
            mesh,
            temperature,
            temperature_history,
            enthalpy,
            enthalpy_history,
            melt_fraction,
            melt_fraction_history,
            vapor_fraction,
            vapor_fraction_history,
            current_step: 0,
            material_library,
        };
        
        if let Some(zone_map) = &solver.params.zone_map {
            solver.mesh.set_zones(zone_map.clone());
        }
        
        Ok(solver)
    }
    
    /// Executa a simulação completa
    /// `progress_callback`: Fn(progress: f32) -> bool (return false to cancel)
    /// `cancel_flag`: Atomic flag checked for external cancellation requests
    pub fn run(
        &mut self,
        progress_callback: Option<&dyn Fn(f32) -> bool>,
        cancel_flag: Arc<AtomicBool>,
    ) -> Result<SimulationResults, String> {
        let start_time = Instant::now();

        info!("Iniciando simulação com {} passos de tempo, {} tochas e material: {}",
              self.params.time_steps, self.params.torches.len(), self.params.material.name);

        let mut executed_steps = 0;
        let mut cancelled = false;

        // Loop principal de simulação
        for step in 0..self.params.time_steps {
            // Check for external cancellation request
            if cancel_flag.load(Ordering::Relaxed) {
                warn!("Cancelamento solicitado externamente no passo {}", step);
                cancelled = true;
                break;
            }

            self.current_step = step;
            executed_steps = step + 1; // Track completed steps

            // Calcular termos fonte (baseado na temperatura do passo anterior T^n)
            let sources = self.calculate_sources();

            // Resolver um passo de tempo para a Entalpia H^{n+1}
            if let Err(e) = self.solve_enthalpy_time_step(&sources) {
                error!("Erro ao resolver passo de tempo {}: {}", step, e);
                return Err(format!("Erro no passo {}: {}", step, e));
            }

            // Atualizar Temperatura e Frações de Fase a partir da Entalpia H^{n+1}
            if let Err(e) = self.update_temperature_and_fractions_from_enthalpy() {
                 error!("Erro ao atualizar temperatura/fração no passo {}: {}", step, e);
                 return Err(format!("Erro na atualização T/fração no passo {}: {}", step, e));
            }

            // Armazenar resultado no histórico
            // Ensure step + 1 is within bounds before slicing
            if step + 1 < self.enthalpy_history.shape()[2] {
                 self.enthalpy_history.slice_mut(s![.., .., step + 1]).assign(&self.enthalpy);
                 self.temperature_history.slice_mut(s![.., .., step + 1]).assign(&self.temperature);

                 // Armazenar frações de mudança de fase no histórico, se necessário
                 if let Some(melt_fraction) = &self.melt_fraction {
                     if let Some(melt_history) = &mut self.melt_fraction_history {
                          if step + 1 < melt_history.shape()[2] {
                             melt_history.slice_mut(s![.., .., step + 1]).assign(melt_fraction);
                          }
                     }
                 }

                 if let Some(vapor_fraction) = &self.vapor_fraction {
                     if let Some(vapor_history) = &mut self.vapor_fraction_history {
                          if step + 1 < vapor_history.shape()[2] {
                             vapor_history.slice_mut(s![.., .., step + 1]).assign(vapor_fraction);
                          }
                     }
                 }
            } else {
                 warn!("Índice do histórico ({}) fora dos limites ({}) no passo {}", step + 1, self.enthalpy_history.shape()[2], step);
            }

            // Reportar progresso e check for cancellation from callback
            if let Some(callback) = progress_callback {
                let progress = (step + 1) as f32 / self.params.time_steps as f32;
                if !callback(progress) { // Callback returns false to signal cancellation
                    warn!("Cancelamento solicitado pelo callback no passo {}", step);
                    cancelled = true;
                    break;
                }
            }

            if (step + 1) % 10 == 0 || step + 1 == self.params.time_steps {
                 info!("Passo de tempo {}/{} concluído", step + 1, self.params.time_steps);
            }
        }

        let execution_time = start_time.elapsed().as_secs_f64();

        if cancelled {
             warn!("Simulação cancelada após {} passos. Tempo de execução: {:.2} segundos", executed_steps, execution_time);
             // Return Err to indicate cancellation, state will be updated by the calling thread
             return Err("Simulation cancelled".to_string());
        } else {
             info!("Simulação concluída em {:.2} segundos após {} passos", execution_time, executed_steps);
        }

        // Trim history arrays to the number of executed steps (+1 for initial state)
        let final_history_steps = executed_steps + 1;
        let temp_history = self.temperature_history.slice(s![.., .., 0..final_history_steps]).to_owned();
        let enthalpy_history = self.enthalpy_history.slice(s![.., .., 0..final_history_steps]).to_owned();

        let melt_history = self.melt_fraction_history.as_ref().map(|hist|
            hist.slice(s![.., .., 0..final_history_steps]).to_owned()
        );
        let vapor_history = self.vapor_fraction_history.as_ref().map(|hist|
             hist.slice(s![.., .., 0..final_history_steps]).to_owned()
        );

        // Criar informações de mudança de fase, se necessário
        let phase_change_info = if self.params.enable_phase_changes && (melt_history.is_some() || vapor_history.is_some()) {
            Some(PhaseChangeInfo {
                melt_fraction: melt_history,
                vapor_fraction: vapor_history,
            })
        } else {
            None
        };

        // Criar resultados
        let results = SimulationResults {
            parameters: self.params.clone(),
            mesh: self.mesh.clone(),
            temperature: temp_history,
            enthalpy: enthalpy_history,
            execution_time,
            phase_change_info,
            executed_steps: executed_steps,
        };

        Ok(results)
    }
    
    /// Calcula os termos fonte para a equação de calor (baseado na temperatura T^n)
    fn calculate_sources(&self) -> HeatSources {
        let mut sources = HeatSources::new(self.params.nr, self.params.nz);
        
        // Calcular termo fonte de radiação
        if self.params.enable_radiation {
            sources.radiation = calculate_radiation_source(
                &self.mesh,
                &self.params.torches,
                &self.temperature,
                &self.params.material,
            );
        }
        
        // Calcular termo fonte de convecção
        if self.params.enable_convection {
            sources.convection = calculate_convection_source(
                &self.mesh,
                &self.params.torches,
                &self.temperature,
                self.params.convection_coefficient,
            );
        }
        
        // Termo fonte das tochas é incorporado em radiation e convection.
        sources
    }
    
    /// Resolve um passo de tempo para a entalpia usando o método de Crank-Nicolson (aproximado)
    /// e um solver SOR (Successive Over-Relaxation) para o sistema linear.
    /// Atualiza `self.enthalpy` para H^{n+1}.
    fn solve_enthalpy_time_step(&mut self, sources: &HeatSources) -> Result<(), String> {
        // Solver parameters
        let max_iterations = 1000; // Max iterations for SOR (Not used by Explicit Euler)
        let tolerance = 1e-4;      // Convergence tolerance for SOR (Not used by Explicit Euler)
        let omega = 1.5;           // SOR relaxation factor (Not used by Explicit Euler)

        // Usa self.temperature (T^n) e self.enthalpy (H^n) como estado inicial
        // e atualiza self.enthalpy (para H^{n+1}) in-place.
        // Clone temperature to avoid borrowing self both mutably and immutably
        let temperature_clone = self.temperature.clone();
        self.solve_linear_system_explicit_enthalpy(
            max_iterations,
            tolerance,
            omega,
            sources,
            &temperature_clone
        )
    }

    /// Implementação do solver **Explícito de Euler** para a equação da entalpia.
    /// Atualiza `self.enthalpy` para H^{n+1}.
    /// Usa T^n para calcular propriedades como k e rho.
    /// **AVISO:** Este método pode ser instável para passos de tempo grandes.
    fn solve_linear_system_explicit_enthalpy(
        &mut self,
        _max_iterations: usize,
        _tolerance: f64,
        _omega: f64,
        sources: &HeatSources,
        temperature_n: &Array2<f64>,
    ) -> Result<(), String> {
        let nr = self.params.nr;
        let nz = self.params.nz;
        let dt = self.params.time_step;

        // H^{n+1} (será calculado), H^n (valor atual em self.enthalpy)
        let mut enthalpy_np1 = self.enthalpy.clone();
        let enthalpy_n = &self.enthalpy;

        // Pré-calcular volumes e propriedades dependentes de T^n
        let mut rho_n = Array2::<f64>::zeros((nr, nz));
        let mut k_n = Array2::<f64>::zeros((nr, nz));

        // Preencher propriedades baseadas em T^n
        Zip::from(&mut rho_n)
            .and(&mut k_n)
            .and(temperature_n)
            .par_for_each(|rho, k, &temp_n| {
                let props = &self.params.material;
                *rho = props.get_density(temp_n);
                *k = props.get_thermal_conductivity(temp_n);
            });

        // --- Atualização Explícita de Euler para H ---
        // H_ij^{n+1} = H_ij^n + (dt / (rho_ij^n * V_ij)) * [ Sum(Fluxos @ T^n) + S_ij V_ij ]
        // Onde Sum(Fluxos @ T^n) é o termo de divergência discreta V * nabla.(k^n nabla T^n)

        let enthalpy_n_ref = &enthalpy_n;
        let mesh_ref = &self.mesh;
        let k_n_ref = &k_n;
        let temperature_n_ref = &temperature_n;
        let sources_ref = sources;
        let rho_n_ref = &rho_n;

        Zip::indexed(&mut enthalpy_np1).par_for_each(|(i, j), h_np1| {
            let r = mesh_ref.r_coords[i];
            let dr = mesh_ref.dr;
            let dz = mesh_ref.dz;
            let vol = mesh_ref.cell_volumes[[i, j]];

            // Densidade no passo n (T^n)
            let rho_ij_n = rho_n_ref[[i, j]];

            // Termo fonte total S = S_torch + S_rad + S_conv (W/m³)
            let source_term_volumetric = sources_ref.radiation[[i, j]]
                                           + sources_ref.convection[[i, j]]
                                           + sources_ref.phase_change[[i, j]];
            let source_term = source_term_volumetric * vol;

            // Termos de difusão (baseados em T^n) - V * nabla.(k^n nabla T^n) (W)
            let mut diffusion_term_tn = 0.0;

            // Termo radial: (Flux_e - Flux_w)
            if i == 0 {
                let k_face_e = (k_n_ref[[0, j]] + k_n_ref[[1, j]]) / 2.0;
                let area_e = (mesh_ref.r_coords[0] + mesh_ref.dr / 2.0) * mesh_ref.dtheta * mesh_ref.dz;
                let grad_t_e = (temperature_n_ref[[1, j]] - temperature_n_ref[[0, j]]) / dr;
                diffusion_term_tn += k_face_e * area_e * grad_t_e;

            } else {
                let k_face_w = (k_n_ref[[i, j]] + k_n_ref[[i - 1, j]]) / 2.0;
                let area_w = (mesh_ref.r_coords[i - 1] + mesh_ref.dr / 2.0) * mesh_ref.dtheta * mesh_ref.dz;
                let grad_t_w = (temperature_n_ref[[i, j]] - temperature_n_ref[[i - 1, j]]) / dr;
                diffusion_term_tn -= k_face_w * area_w * grad_t_w;

                if i < nr - 1 {
                    let k_face_e = (k_n_ref[[i, j]] + k_n_ref[[i + 1, j]]) / 2.0;
                    let area_e = (mesh_ref.r_coords[i] + mesh_ref.dr / 2.0) * mesh_ref.dtheta * mesh_ref.dz;
                    let grad_t_e = (temperature_n_ref[[i + 1, j]] - temperature_n_ref[[i, j]]) / dr;
                    diffusion_term_tn += k_face_e * area_e * grad_t_e;
                } else {
                    // Borda externa (r=R)
                }
            }

            // Termo axial: (Flux_n - Flux_s)
            if j > 0 {
                let k_face_s = (k_n_ref[[i, j]] + k_n_ref[[i, j - 1]]) / 2.0;
                let area_s = mesh_ref.r_coords[i] * mesh_ref.dr * mesh_ref.dtheta;
                let grad_t_s = (temperature_n_ref[[i, j]] - temperature_n_ref[[i, j - 1]]) / dz;
                diffusion_term_tn -= k_face_s * area_s * grad_t_s;
            } else {
                // Base (z=0) - Condição de contorno
            }
            if j < nz - 1 {
                let k_face_n = (k_n_ref[[i, j]] + k_n_ref[[i, j + 1]]) / 2.0;
                let area_n = mesh_ref.r_coords[i] * mesh_ref.dr * mesh_ref.dtheta;
                let grad_t_n = (temperature_n_ref[[i, j + 1]] - temperature_n_ref[[i, j]]) / dz;
                diffusion_term_tn += k_face_n * area_n * grad_t_n;
            } else {
                // Topo (z=H) - Condição de contorno
            }

            // Atualização Explícita
            let h_old = enthalpy_n_ref[[i, j]];
            let h_new_explicit = if rho_ij_n > 1e-6 && vol > 1e-9 {
                h_old + (dt / (rho_ij_n * vol)) * (diffusion_term_tn + source_term)
            } else {
                h_old
            };

            *h_np1 = h_new_explicit;
        });

        // Atualiza o estado do solver com o resultado do passo explícito
        self.enthalpy.assign(&enthalpy_np1);

        Ok(())
    }

    /// Atualiza os campos de temperatura e fração de fase a partir do campo de entalpia atual.
    fn update_temperature_and_fractions_from_enthalpy(&mut self) -> Result<(), String> {
        let material_props = &self.params.material; // Immutable borrow for material properties
        let enable_phase_changes = self.params.enable_phase_changes; // Copy bool

        // Update temperature
        Zip::from(&mut self.temperature)
            .and(&self.enthalpy)
            .par_for_each(|temp_val, &h_val| {
                let (t, _fm, _fv) = calculate_temperature_and_fractions(h_val, material_props, 0.0);
                *temp_val = t;
            });

        // Update melt fraction if enabled and present
        if enable_phase_changes {
            if let Some(melt_fraction_arr) = &mut self.melt_fraction {
                Zip::from(melt_fraction_arr)
                    .and(&self.enthalpy)
                    .par_for_each(|mf_val, &h_val| {
                        let (_t, fm, _fv) = calculate_temperature_and_fractions(h_val, material_props, 0.0);
                        *mf_val = fm;
                    });
            }

            // Update vapor fraction if enabled and present
            if let Some(vapor_fraction_arr) = &mut self.vapor_fraction {
                Zip::from(vapor_fraction_arr)
                    .and(&self.enthalpy)
                    .par_for_each(|vf_val, &h_val| {
                        let (_t, _fm, fv) = calculate_temperature_and_fractions(h_val, material_props, 0.0);
                        *vf_val = fv;
                    });
            }
        }

        Ok(())
    }

    /// Retorna o campo de temperatura atual
    pub fn get_temperature(&self) -> &Array2<f64> {
        &self.temperature
    }

    /// Retorna o campo de entalpia atual
    pub fn get_enthalpy(&self) -> &Array2<f64> {
        &self.enthalpy
    }

    /// Retorna o histórico de temperatura
    pub fn get_temperature_history(&self) -> &Array3<f64> {
        &self.temperature_history
    }

    /// Retorna o histórico de entalpia
    pub fn get_enthalpy_history(&self) -> &Array3<f64> {
        &self.enthalpy_history
    }

    /// Retorna a temperatura para um passo de tempo específico
    pub fn get_temperature_at_step(&self, step: usize) -> Result<Array2<f64>, String> {
        if step > self.current_step {
            return Err(format!("Passo de tempo {} não disponível (atual: {})", step, self.current_step));
        }
        
        Ok(self.temperature_history.slice(s![.., .., step]).to_owned())
    }
}

/// Calcula a entalpia específica (J/kg) a partir da temperatura, frações de fase e propriedades.
/// Assume T_ref como a temperatura de referência para H=0 no estado sólido.
/// Simplificação: Assume Cp constante em cada fase (usa get_specific_heat na temperatura dada).
fn calculate_enthalpy_from_temperature(
    temperature: f64,
    melt_fraction: f64,
    vapor_fraction: f64,
    props: &MaterialProperties,
    t_ref: f64,
) -> f64 {
    let cp_solid = props.get_specific_heat(props.melting_point.map_or(t_ref, |tm| (tm + t_ref) / 2.0));
    let cp_liquid = props.melting_point.map_or(cp_solid, |tm| {
        props.vaporization_point.map_or(
            props.get_specific_heat(tm + 1.0),
            |tv| props.get_specific_heat((tm + tv) / 2.0)
        )
    });
    let cp_gas = props.vaporization_point.map_or(cp_liquid, |tv| props.get_specific_heat(tv + 1.0));

    let tm = props.melting_point;
    let tv = props.vaporization_point;
    let hf = props.latent_heat_fusion;
    let hv = props.latent_heat_vaporization;

    let mut enthalpy = 0.0;

    if let Some(melting_point) = tm {
        if temperature <= t_ref { return 0.0; }
        if temperature < melting_point {
            enthalpy += cp_solid * (temperature - t_ref);
            return enthalpy.max(0.0);
        } else {
            enthalpy += cp_solid * (melting_point - t_ref);
        }
    } else {
        enthalpy += cp_solid * (temperature - t_ref);
        return enthalpy.max(0.0);
    }

    if let (Some(melting_point), Some(latent_heat)) = (tm, hf) {
        if temperature == melting_point {
            enthalpy += melt_fraction * latent_heat;
            return enthalpy.max(0.0);
        } else if temperature > melting_point {
             enthalpy += latent_heat;
        }
    }

    if let (Some(melting_point), Some(vaporization_point)) = (tm, tv) {
        if temperature < vaporization_point {
            enthalpy += cp_liquid * (temperature - melting_point);
            return enthalpy.max(0.0);
        } else {
            enthalpy += cp_liquid * (vaporization_point - melting_point);
        }
    } else if tm.is_some() && tv.is_none() {
        let current_melting_point = tm.unwrap();
        enthalpy += cp_liquid * (temperature - current_melting_point);
        return enthalpy.max(0.0);
    }

    if let (Some(vaporization_point), Some(latent_heat)) = (tv, hv) {
        if temperature == vaporization_point {
            enthalpy += vapor_fraction * latent_heat;
            return enthalpy.max(0.0);
        } else if temperature > vaporization_point {
             enthalpy += latent_heat;
        }
    }

    if let Some(vaporization_point) = tv {
        if temperature > vaporization_point {
            enthalpy += cp_gas * (temperature - vaporization_point);
            return enthalpy.max(0.0);
        }
    }

    enthalpy.max(0.0)
}

/// Calcula a temperatura e as frações de fase a partir da entalpia específica.
/// Retorna (temperatura, fração_fusão, fração_vapor)
/// Assume T_ref como a temperatura de referência usada para calcular a entalpia.
/// Simplificação: Assume Cp constante em cada fase.
fn calculate_temperature_and_fractions(
    enthalpy: f64,
    props: &MaterialProperties,
    t_ref: f64,
) -> (f64, f64, f64) {
    let cp_solid = props.get_specific_heat(props.melting_point.map_or(t_ref, |tm| (tm + t_ref) / 2.0));
    let cp_liquid = props.melting_point.map_or(cp_solid, |tm| {
        props.vaporization_point.map_or(
            props.get_specific_heat(tm + 1.0),
            |tv| props.get_specific_heat((tm + tv) / 2.0)
        )
    });
    let cp_gas = props.vaporization_point.map_or(cp_liquid, |tv| props.get_specific_heat(tv + 1.0));

    let tm = props.melting_point;
    let tv = props.vaporization_point;
    let hf = props.latent_heat_fusion;
    let hv = props.latent_heat_vaporization;

    let mut h_lower_bound = 0.0;
    let mut temperature = t_ref;
    let mut melt_fraction = 0.0;
    let mut vapor_fraction = 0.0;

    if enthalpy <= h_lower_bound {
        return (t_ref, 0.0, 0.0);
    }

    if let Some(melting_point) = tm {
         if melting_point <= t_ref {
         } else {
             let h_solid_max = h_lower_bound + cp_solid * (melting_point - t_ref);
             if enthalpy <= h_solid_max {
                 temperature = t_ref + (enthalpy - h_lower_bound) / cp_solid.max(1e-9);
                 return (temperature, 0.0, 0.0);
             }
             h_lower_bound = h_solid_max;
             temperature = melting_point;
         }
    } else {
        temperature = t_ref + (enthalpy - h_lower_bound) / cp_solid.max(1e-9);
        return (temperature, 0.0, 0.0);
    }

    if let (Some(melting_point), Some(latent_heat)) = (tm, hf) {
         if melting_point >= temperature {
             let h_melt_max = h_lower_bound + latent_heat;
             if enthalpy <= h_melt_max {
                 melt_fraction = (enthalpy - h_lower_bound) / latent_heat.max(1e-9);
                 temperature = melting_point;
                 return (temperature, melt_fraction, 0.0);
             }
             h_lower_bound = h_melt_max;
             melt_fraction = 1.0;
         }
    }

    if let (Some(melting_point), Some(vaporization_point)) = (tm, tv) {
         if vaporization_point <= melting_point {
         } else if temperature >= melting_point {
             let h_liquid_max = h_lower_bound + cp_liquid * (vaporization_point - melting_point);
             if enthalpy <= h_liquid_max {
                 temperature = melting_point + (enthalpy - h_lower_bound) / cp_liquid.max(1e-9);
                 return (temperature, 1.0, 0.0);
             }
             h_lower_bound = h_liquid_max;
             temperature = vaporization_point;
             melt_fraction = 1.0;
         }
    } else if tm.is_some() && tv.is_none() {
        let current_melting_point = tm.unwrap();
         if temperature >= current_melting_point {
             temperature = current_melting_point + (enthalpy - h_lower_bound) / cp_liquid.max(1e-9);
             return (temperature, 1.0, 0.0);
         }
    }

    if let (Some(vaporization_point), Some(latent_heat)) = (tv, hv) {
         if temperature >= vaporization_point {
             let h_vapor_max = h_lower_bound + latent_heat;
             if enthalpy <= h_vapor_max {
                 vapor_fraction = (enthalpy - h_lower_bound) / latent_heat.max(1e-9);
                 temperature = vaporization_point;
                 return (temperature, 1.0, vapor_fraction);
             }
             h_lower_bound = h_vapor_max;
             vapor_fraction = 1.0;
             melt_fraction = 1.0;
         }
    }

    if let Some(vaporization_point) = tv {
        if temperature >= vaporization_point {
            temperature = vaporization_point + (enthalpy - h_lower_bound) / cp_gas.max(1e-9);
            return (temperature, 1.0, 1.0);
        }
    }

    (temperature, melt_fraction, vapor_fraction)
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    fn create_test_material_const_cp(name: &str, melting_point: Option<f64>, latent_heat_fusion: Option<f64>,
                             vaporization_point: Option<f64>, latent_heat_vaporization: Option<f64>,
                             cp: f64, rho: f64, k: f64) -> MaterialProperties {
        let mut mat = MaterialProperties::new(name, rho, cp, k);
        mat.melting_point = melting_point;
        mat.latent_heat_fusion = latent_heat_fusion;
        mat.vaporization_point = vaporization_point;
        mat.latent_heat_vaporization = latent_heat_vaporization;
        let cp_val = cp;
        mat.specific_heat = Box::new(move |_| cp_val);
        let rho_val = rho;
        mat.density = Box::new(move |_| rho_val);
         let k_val = k;
        mat.thermal_conductivity = Box::new(move |_| k_val);
        mat
    }

    #[test]
    fn test_enthalpy_temperature_conversion_solid() {
         let mat = create_test_material_const_cp("MatSolid", Some(100.0), Some(1000.0), Some(500.0), Some(5000.0), 10.0, 1.0, 1.0);
        let t_ref = 0.0;

        let h = calculate_enthalpy_from_temperature(50.0, 0.0, 0.0, &mat, t_ref);
        assert_relative_eq!(h, 10.0 * (50.0 - 0.0), epsilon = 1e-6);
        let (t, fm, fv) = calculate_temperature_and_fractions(h, &mat, t_ref);
        assert_relative_eq!(t, 50.0, epsilon = 1e-6);
        assert_relative_eq!(fm, 0.0, epsilon = 1e-6);
        assert_relative_eq!(fv, 0.0, epsilon = 1e-6);
    }

    #[test]
    fn test_enthalpy_temperature_conversion_melting() {
         let mat = create_test_material_const_cp("MatMelt", Some(100.0), Some(1000.0), Some(500.0), Some(5000.0), 10.0, 1.0, 1.0);
        let t_ref = 0.0;
        let h_solid_max = 10.0 * (100.0 - 0.0);

        let h = h_solid_max + 0.5 * 1000.0;
        let (t, fm, fv) = calculate_temperature_and_fractions(h, &mat, t_ref);
        assert_relative_eq!(t, 100.0, epsilon = 1e-6);
        assert_relative_eq!(fm, 0.5, epsilon = 1e-6);
        assert_relative_eq!(calculate_enthalpy_from_temperature(t, fm, fv, &mat, t_ref), h, epsilon = 1e-6);
    }

    #[test]
    fn test_enthalpy_temperature_conversion_liquid() {
         let mat = create_test_material_const_cp("MatLiquid", Some(100.0), Some(1000.0), Some(500.0), Some(5000.0), 10.0, 1.0, 1.0);
        let t_ref = 0.0;
        let h_solid_max = 10.0 * (100.0 - 0.0);
        let h_melt_max = h_solid_max + 1000.0;

        let h = h_melt_max + 10.0 * (300.0 - 100.0);
        let (t, fm, fv) = calculate_temperature_and_fractions(h, &mat, t_ref);
        assert_relative_eq!(t, 300.0, epsilon = 1e-6);
        assert_relative_eq!(fm, 1.0, epsilon = 1e-6);
        assert_relative_eq!(calculate_enthalpy_from_temperature(t, 1.0, 0.0, &mat, t_ref), h, epsilon = 1e-6);
    }

    #[test]
    fn test_enthalpy_temperature_conversion_vaporizing() {
         let mat = create_test_material_const_cp("MatVapor", Some(100.0), Some(1000.0), Some(500.0), Some(5000.0), 10.0, 1.0, 1.0);
        let t_ref = 0.0;
        let h_solid_max = 10.0 * (100.0 - 0.0);
        let h_melt_max = h_solid_max + 1000.0;
        let h_liquid_max = h_melt_max + 10.0 * (500.0 - 100.0);

        let h = h_liquid_max + 0.7 * 5000.0;
        let (t, fm, fv) = calculate_temperature_and_fractions(h, &mat, t_ref);
        assert_relative_eq!(t, 500.0, epsilon = 1e-6);
        assert_relative_eq!(fm, 1.0, epsilon = 1e-6);
        assert_relative_eq!(fv, 0.7, epsilon = 1e-6);
        assert_relative_eq!(calculate_enthalpy_from_temperature(t, fm, fv, &mat, t_ref), h, epsilon = 1e-6);
    }

    #[test]
    fn test_enthalpy_temperature_conversion_gas() {
         let mat = create_test_material_const_cp("MatGas", Some(100.0), Some(1000.0), Some(500.0), Some(5000.0), 10.0, 1.0, 1.0);
        let t_ref = 0.0;
        let h_solid_max = 10.0 * (100.0 - 0.0);
        let h_melt_max = h_solid_max + 1000.0;
        let h_liquid_max = h_melt_max + 10.0 * (500.0 - 100.0);
        let h_vapor_max = h_liquid_max + 5000.0;

        let h = h_vapor_max + 10.0 * (700.0 - 500.0);
        let (t, fm, fv) = calculate_temperature_and_fractions(h, &mat, t_ref);
        assert_relative_eq!(t, 700.0, epsilon = 1e-6);
        assert_relative_eq!(fm, 1.0, epsilon = 1e-6);
        assert_relative_eq!(fv, 1.0, epsilon = 1e-6);
        assert_relative_eq!(calculate_enthalpy_from_temperature(t, 1.0, 1.0, &mat, t_ref), h, epsilon = 1e-6);
    }

    #[test]
    fn test_simulation_with_material_properties() {
        let library = MaterialLibrary::new();
        let test_mat = create_test_material_const_cp("TestSimple", None, None, None, None, 100.0, 1000.0, 10.0);

        let mut params = SimulationParameters::new(0.1, 0.05, 5, 5);
        params.material = test_mat;
        params.time_steps = 2;
        params.total_time = 2.0;
        params.time_step = 1.0;
        params.enable_phase_changes = false;
        params.add_torch(PlasmaTorch::new(
            "torch1",
            0.0, 0.0, 0.05, 90.0, 0.0, 10.0, 0.001, 1000.0
        ));

        let mut solver = HeatSolver::new(params).unwrap();
        let results = solver.run(None, Arc::new(AtomicBool::new(false))).unwrap();

        assert_eq!(results.parameters.material.name, "TestSimple");
        assert_eq!(results.executed_steps, 2);
        assert_eq!(results.temperature.shape(), &[5, 5, 3]);
        assert_eq!(results.enthalpy.shape(), &[5, 5, 3]);
    }

    #[test]
    fn test_phase_change_tracking_enthalpy() {
        let material = create_test_material_const_cp("MatPhase", Some(100.0), Some(1000.0), None, None, 10.0, 1.0, 1.0);

        let mut params = SimulationParameters::new(0.01, 0.005, 3, 3);
        params.material = material;
        params.time_steps = 5;
        params.total_time = 0.05;
        params.time_step = 0.01;
        params.enable_phase_changes = true;
        params.initial_temperature = 90.0;

        params.add_torch(PlasmaTorch::new(
             "torch1",
             0.0, 0.0, 0.005, 90.0, 0.0, 1000.0, 0.001, 50000.0
        ));

        let mut solver = HeatSolver::new(params).unwrap();
        let results = solver.run(None, Arc::new(AtomicBool::new(false)));

        assert!(results.is_ok(), "A simulação explícita falhou. Tente um dt menor ou implemente um solver implícito. Erro: {:?}", results.err());
        if let Ok(res) = results {
            assert!(res.phase_change_info.is_some());
            let info = res.phase_change_info.unwrap();
            assert!(info.melt_fraction.is_some());

            let final_melt_fraction = info.melt_fraction.unwrap().slice(s![.., .., res.executed_steps]).to_owned();
            assert!(final_melt_fraction.iter().any(|&f| f > 1e-6), "Nenhuma fusão detectada (verificar dt, potência da tocha, duração). Fração final: {:?}", final_melt_fraction);
            assert!(final_melt_fraction.iter().all(|&f| f >= -1e-6 && f <= 1.0 + 1e-6), "Fração de fusão fora do intervalo [0, 1]. Fração final: {:?}", final_melt_fraction);
        }
    }
}
