import { createContext, useContext, useState, ReactNode } from 'react';
import L from 'leaflet';

interface Scenario {
    startPoint: [number, number] | null;
    endPoint: [number, number] | null;
    blockages: { type: string; coords: any }[];
    route: any;
}

interface ScenarioContextType {
    currentScenario: Scenario;
    updateScenario: (updates: Partial<Scenario>) => void;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export function ScenarioProvider({ children }: { children: ReactNode }) {
    const [currentScenario, setCurrentScenario] = useState<Scenario>({
        startPoint: null,
        endPoint: null,
        blockages: [],
        route: null
    });

    const updateScenario = (updates: Partial<Scenario>) => {
        setCurrentScenario((prev) => ({ ...prev, ...updates }));
    };

    return (
        <ScenarioContext.Provider value={{ currentScenario, updateScenario }}>
            {children}
        </ScenarioContext.Provider>
    );
}

export function useScenario() {
    const context = useContext(ScenarioContext);
    if (!context) {
        throw new Error('useScenario must be used within a ScenarioProvider');
    }
    return context;
}