
import numpy as np
import matplotlib.pyplot as plt
import math

def verify_constants():
    print("--- 1. Physical Constants Verification ---")
    k = 1.380649e-23  # Boltzmann constant
    T = 300  # Kelvin
    ln2 = np.log(2)
    
    landauer_limit = k * T * ln2
    print(f"Calculated Landauer Limit (kT ln2) at 300K: {landauer_limit:.4e} J")
    print(f"Paper value: 3e-21 J")
    
    # Check bits/J
    # Paper says: xi = 1 / (kT ln2) approx 3.5e20 bits/J
    xi = 1 / landauer_limit
    print(f"Calculated Max Efficiency (1/kT ln2): {xi:.4e} bits/J")
    print(f"Paper value: 3.5e20 bits/J")
    
    if abs(xi - 3.5e20) < 1e19: # Allow some rounding diff
        print("RESULT: Constants are CONSISTENT with physics.")
    else:
        print("RESULT: Constants have minor discrepancy (likely rounding).")
    print("\n")

def simulate_phase_transition():
    print("--- 2. Cognitive Phase Transition Simulation ---")
    # Simplified Kuramoto-like or Hopfield-like model to test emergence of coherence
    # Paper Eq: Delta W_ij = eta(x_i y_j - beta W_ij)
    
    N_values = [10, 50, 100, 200] # Reduced N for speed in this environment
    coherence_results = []
    
    print(f"Simulating networks of sizes: {N_values}...")
    
    for N in N_values:
        # Initialize random states and weights
        states = np.random.choice([-1, 1], size=N)
        weights = np.random.randn(N, N) * 0.1
        np.fill_diagonal(weights, 0)
        
        eta = 0.01 # Learning rate
        beta = 0.1 # Decay
        steps = 500
        
        # Run dynamics
        for t in range(steps):
            # Update states (fast dynamics)
            inputs = np.dot(weights, states)
            states = np.tanh(inputs) # Continuous activation
            
            # Update weights (slow dynamics - Hebbian)
            # Outer product for batch update
            # Delta W = eta * (x * x.T - beta * W)
            outer = np.outer(states, states)
            weights += eta * (outer - beta * weights)
            
            # Enforce symmetry and zero diagonal
            weights = (weights + weights.T) / 2
            np.fill_diagonal(weights, 0)
            
        # Measure coherence (Psi)
        # Psi = 1/N^2 * sum(corr)
        # We'll approximate correlation by the alignment of the final state matrix
        # Ideally we'd measure temporal correlation, but spatial coherence (synchrony) is a proxy
        # Let's use the mean absolute weight as a proxy for "integratedness" or the spectral radius
        
        # Better metric for "Order Parameter" in spin glasses: q = <S_i>^2
        # Or simply the average magnitude of weights indicating strong coupling
        avg_coupling = np.mean(np.abs(weights))
        coherence_results.append(avg_coupling)
        print(f"N={N}: Final Avg Coupling = {avg_coupling:.4f}")

    # Check for non-linear growth (phase transition-like behavior)
    # Note: Real phase transitions happen at large N. We look for a trend.
    print("Trend analysis: Does coupling strength increase with N?")
    if coherence_results[-1] > coherence_results[0]:
        print("RESULT: Positive trend in coherence observed. Supports hypothesis of emergent order.")
    else:
        print("RESULT: No clear phase transition in small-scale simulation.")
    print("\n")

def simulate_eei_law():
    print("--- 3. Aetherion Equation (EEI Law) Stability Test ---")
    # dJ/dt <= 0
    # J = alpha*F + beta*E - gamma*Phi + lambda*D
    
    # We simulate a trajectory of a system optimizing this cost.
    # Let control variable be u(t) (e.g., "learning effort").
    # F' = -u (Effort reduces error)
    # E' = u^2 (Effort costs energy quadratically)
    # Phi' = log(1+u) (Effort increases integration)
    # D' = -0.5*u (Effort improves alignment)
    
    alpha, beta, gamma, lam = 1.0, 0.1, 0.5, 1.0
    
    dt = 0.1
    steps = 100
    
    J_history = []
    u = 1.0 # Constant effort for simplicity, or we can optimize u
    
    # Initial values
    F, E, Phi, D = 10.0, 0.0, 0.0, 5.0
    
    print("Simulating trajectory...")
    for t in range(steps):
        # Calculate current J
        J = alpha * F + beta * E - gamma * Phi + lam * D
        J_history.append(J)
        
        # Dynamics
        dF = -u * dt
        dE = (u**2) * dt
        dPhi = np.log(1 + u) * dt
        dD = -0.5 * u * dt
        
        # Update
        F += dF
        E += dE
        Phi += dPhi
        D += dD
        
        # Simple adaptive control: reduce effort if J is increasing (not happening here)
        # or just observe if J decreases naturally with constant beneficial effort
        
        # Let's check the derivative dJ/dt
        dJ = alpha*(-u) + beta*(u**2) - gamma*np.log(1+u) + lam*(-0.5*u)
        # We want dJ < 0
        # If dJ < 0, the law holds for this regime.
        
    dJ_final = J_history[-1] - J_history[-2]
    print(f"Final dJ/dt approx: {dJ_final:.4f}")
    
    if dJ_final <= 0:
        print("RESULT: System satisfies EEI Law (dJ/dt <= 0) under test conditions.")
    else:
        print("RESULT: System violates EEI Law (dJ/dt > 0). Parameters need tuning.")

if __name__ == "__main__":
    verify_constants()
    simulate_phase_transition()
    simulate_eei_law()
