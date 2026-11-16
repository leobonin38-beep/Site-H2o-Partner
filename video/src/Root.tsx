import { Composition } from 'remotion';
import { Softener } from './Softener';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Softener-wide" component={Softener} durationInFrames={150} fps={30} width={1600} height={900} defaultProps={{ layout: 'wide' as const }} />
    <Composition id="Softener-tall" component={Softener} durationInFrames={90} fps={30} width={900} height={1200} defaultProps={{ layout: 'tall' as const }} />
  </>
);
