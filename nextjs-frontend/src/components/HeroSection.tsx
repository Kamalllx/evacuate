import { Button } from 'react-bootstrap';

export default function HeroSection({ onStartPlanning }: { onStartPlanning: () => void }) {
    return (
        <section id="heroSection" className="py-5 bg-light">
            <div className="container text-center">
                <h1 className="display-4">Evacuation Planning & Simulation Tool</h1>
                <p className="lead">Plan safe evacuation routes and simulate emergency scenarios</p>
                <Button variant="primary" size="lg" onClick={onStartPlanning}>
                    Start Planning Now
                </Button>
            </div>
        </section>
    );
}