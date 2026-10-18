/* ------------------------------------------------------------------
   Scene.tsx - the contents of VANTAGE, in the order light reaches you.

   Far to near: the instrument that measures, the geometry that
   arranges, the lattice that computes, the field that infers, the
   trace that sketches. The armature and the datum plate are matter
   rather than light, and are lit only by the ember.
   ------------------------------------------------------------------ */

import { EffectSlot } from './EffectSlot';
import { Armature } from './Armature';
import { ModuleGroup } from './ModuleGroup';
import { PostControl } from './post/PostControl';
import { Inside } from './modules/Inside';
import { Edge } from './modules/Edge';
import { Deep } from './modules/Deep';
import { Implicit } from './modules/Implicit';
import { Director } from './Director';
import { Ember } from './Ember';
import { LineLayer } from './layers/LineLayer';
import { PickProxies } from './PickProxies';
import { SpatialLabels } from './SpatialLabels';
import { TraceFigure } from './TraceFigure';
import { GROUND_HEX } from './palette';
import { useUi } from '../ui/store';
import { useWorld } from './WorldContext';

export function Scene() {
  const { world } = useWorld();
  const fieldTreatment = useUi((s) => s.fieldTreatment);

  return (
    <>
      <color attach="background" args={[GROUND_HEX]} />
      <Director />

      {/* enough light to give the armature a lit side; the layers are
          emissive and ignore lights entirely */}
      <ambientLight intensity={0.075} color="#ffdcc4" />
      <directionalLight position={[-7, 10, 4]} intensity={0.16} color="#c9d8ff" />

      <ModuleGroup id="vantage">
        <Armature />
        <LineLayer id="instrument" data={world.instrument} />
        <LineLayer id="design" data={world.design} />
        <EffectSlot id="lattice.cells" />
        <EffectSlot id={fieldTreatment} />
        <LineLayer id="trace" data={world.trace} />
        <TraceFigure />
        <SpatialLabels />
        <PickProxies />
      </ModuleGroup>

      <ModuleGroup id="inside">
        <Inside />
      </ModuleGroup>

      <ModuleGroup id="edge">
        <Edge />
      </ModuleGroup>

      <ModuleGroup id="deep">
        <Deep />
        {/* two implicit surfaces, each over its own stretch of the fall */}
        <Implicit mode="metaballs" position={[0, -40, -62]} radius={3.6} from={0.26} to={0.58} />
        <Implicit mode="fractal" position={[0, -64, -62]} radius={4.4} from={0.6} to={0.95} />
      </ModuleGroup>

      <Ember />

      <EffectSlot id="atmos.film" />
      <PostControl />
    </>
  );
}
