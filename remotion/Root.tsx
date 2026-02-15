import { Composition } from "remotion";
import { AtlasDemoVideo } from "./AtlasDemoVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AtlasDemoVideo"
        component={AtlasDemoVideo}
        durationInFrames={965}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};

// This is required for Remotion CLI
if (typeof window !== "undefined") {
  const { registerRoot } = require("remotion");
  registerRoot(RemotionRoot);
}
