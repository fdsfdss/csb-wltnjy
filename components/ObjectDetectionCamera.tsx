import Webcam from "react-webcam";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { runModelUtils } from "../utils";
import { Tensor } from "onnxruntime-web";

const WebcamComponent = (props: any) => {
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const webcamRef = useRef<Webcam>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const liveDetection = useRef<boolean>(false);
  const [camera, setCamera] = useState("front"); // Add this state at the beginning of your component
  const [isMirrored, setIsMirrored] = useState(false);
  const [countdown, setCountdown] = useState(15); // Countdown starts at 20 seconds

  const [facingMode, setFacingMode] = useState<string>("environment");
  const originalSize = useRef<number[]>([0, 0]);

  const capture = () => {
    const canvas = videoCanvasRef.current!;
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    })!;

    if (facingMode === "user") {
      context.setTransform(-1, 0, 0, 1, canvas.width, 0);
    }

    context.drawImage(
      webcamRef.current!.video!,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (facingMode === "user") {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    return context;
  };

  const runModel = async (ctx: CanvasRenderingContext2D) => {
    const data = props.preprocess(ctx);
    let outputTensor: Tensor;
    let inferenceTime: number;
    [outputTensor, inferenceTime] = await runModelUtils.runModel(
      props.session,
      data
    );

    props.postprocess(outputTensor, props.inferenceTime, ctx);
    setInferenceTime(inferenceTime);
  };

  const runLiveDetection = async () => {
    if (liveDetection.current) {
      liveDetection.current = false;
      return;
    }
    liveDetection.current = true;
    while (liveDetection.current) {
      const startTime = Date.now();
      const ctx = capture();
      if (!ctx) return;
      await runModel(ctx);
      setTotalTime(Date.now() - startTime);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
    }
  };

  const processImage = async () => {
    reset();
    const ctx = capture();
    if (!ctx) return;

    // create a copy of the canvas
    const boxCtx = document
      .createElement("canvas")
      .getContext("2d") as CanvasRenderingContext2D;
    boxCtx.canvas.width = ctx.canvas.width;
    boxCtx.canvas.height = ctx.canvas.height;
    boxCtx.drawImage(ctx.canvas, 0, 0);

    await runModel(boxCtx);
    ctx.drawImage(boxCtx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  const reset = async () => {
    var context = videoCanvasRef.current!.getContext("2d")!;
    context.clearRect(0, 0, originalSize.current[0], originalSize.current[1]);
    liveDetection.current = false;
  };

  const [SSR, setSSR] = useState<Boolean>(true);

  const setWebcamCanvasOverlaySize = () => {
    const element = webcamRef.current!.video!;
    if (!element) return;
    var w = element.offsetWidth;
    var h = element.offsetHeight;
    var cv = videoCanvasRef.current;
    if (!cv) return;
    cv.width = w;
    cv.height = h;
  };

  // close camera when browser tab is minimized
  useEffect(() => {
    if (countdown > 0) {
      // Countdown logic
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Once countdown is over, set SSR to false
      setSSR(false);
    }
  }, [countdown]);

  if (SSR) {
    return <div>Loading...</div>;
  }else {

  return (
    <div className="flex flex-row flex-wrap  justify-evenly align-center w-full">
      <div
        id="webcam-container"
        className="flex items-center justify-center webcam-container"
      >
        <Webcam
          mirrored={isMirrored}
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          imageSmoothing={true}
          videoConstraints={{
            facingMode: facingMode,
            // width: props.width,
            // height: props.height,
          }}
          onLoadedMetadata={() => {
            setWebcamCanvasOverlaySize();
            originalSize.current = [
              webcamRef.current!.video!.offsetWidth,
              webcamRef.current!.video!.offsetHeight,
            ] as number[];
          }}
          forceScreenshotSourceSize={true}
        />
        <canvas
          id="cv1"
          ref={videoCanvasRef}
          style={{
            position: "absolute",
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0)",
          }}
        ></canvas>
      </div>
      <div className="flex flex-col justify-center items-center">
        <div className="flex gap-1 flex-row flex-wrap justify-center items-center m-5">
          <div className="flex gap-1 justify-center items-center items-stretch">

            <button
              onClick={async () => {
                if (liveDetection.current) {
                  liveDetection.current = false;
                } else {
                  runLiveDetection();
                }
              }}
              //on hover, shift the button up
              className={"p-2 rounded-xl hover:translate-y-1 bg-green-500 text-white"}
            >
              Live Detection
            </button>
            <button
            onClick={() => {
              reset();
              const newFacingMode = facingMode === "user" ? "environment" : "user";
              setFacingMode(newFacingMode);
              setCamera(newFacingMode === "user" ? "front" : "rear"); // Update the camera state
            }}
            className="p-2 rounded-xl hover:translate-y-1 bg-blue-500 text-white"
          >
            Toggle Front/Rear Camera
          </button>
          </div>
          <div className="flex gap-1 justify-center items-center items-stretch">
          <button
            onClick={() => {
              reset();
              setIsMirrored(!isMirrored); // Toggle the mirroring
            }}
            className="p-2 rounded-xl hover:translate-y-1 bg-blue-500 text-white"
          >
            Mirror Video
          </button>
            <button
              onClick={reset}
              className="p-2 rounded-xl hover:translate-y-1 bg-red-500 text-white"
            >
              Reset
            </button>
          </div>
        </div>
        <div>{countdown > 0 ? `Please wait ${countdown} seconds to load model...` : 'Model loaded'}</div>
        <div>{"Total FPS: " + (1000 / totalTime).toFixed(2) + "fps"}</div>
        <div className="flex gap-3 flex-row flex-wrap justify-between items-center px-5 w-full">
          <div className="w-full flex justify-end"> {/* This div will take full width and align its children to the end (right) */}
            
          </div>
        </div>
      </div>
    </div>
  );
  }
};

export default WebcamComponent;
