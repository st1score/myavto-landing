// React-island который рендерит готовую Plasmic-страницу по data из getStaticPaths.
// Серверный рендер: Astro вызывает PlasmicComponent при build, HTML вшивается в страницу.
import { PlasmicRootProvider, PlasmicComponent } from '@plasmicapp/loader-react';
import type { ComponentRenderData } from '@plasmicapp/loader-react';
import { PLASMIC } from '../../lib/plasmic';

interface Props {
  componentName: string;
  prefetchedData: ComponentRenderData;
}

export default function PlasmicPage({ componentName, prefetchedData }: Props) {
  return (
    <PlasmicRootProvider loader={PLASMIC} prefetchedData={prefetchedData}>
      <PlasmicComponent component={componentName} />
    </PlasmicRootProvider>
  );
}
