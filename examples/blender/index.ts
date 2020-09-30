import path from "path";
import { Engine, Task, vm, WorkContext } from "../../yajsapi";
import { range } from "../../yajsapi/utils";
import asyncWith from "../../yajsapi/utils/asyncWith";

async function main() {
  let _package = await vm.repo(
    "9a3b5d67b0b27746283cb5f287c13eab1beaa12d92a9f536b747c7ae",
    0.5,
    2.0
  );

  async function* worker(ctx: WorkContext, tasks) {
    ctx.send_file(
      path.join(__dirname, "./cubes.blend"),
      "/golem/resource/scene.blend"
    );
    for await (let task of tasks) {
      let frame = task.data();
      ctx.begin();
      let crops = [
        {
          outfilebasename: "out",
          borders_x: [0.0, 1.0],
          borders_y: [0.0, 1.0],
        },
      ];
      ctx.send_json("/golem/work/params.json", {
        scene_file: "/golem/resource/scene.blend",
        resolution: [400, 300],
        use_compositing: false,
        crops: crops,
        samples: 100,
        frames: [frame],
        output_format: "PNG",
        RESOURCES_DIR: "/golem/resources",
        WORK_DIR: "/golem/work",
        OUTPUT_DIR: "/golem/output",
      });
      ctx.run("/golem/entrypoints/run-blender.sh");
      ctx.download_file(
        `/golem/output/out${frame.toString().padStart(4, "0")}.png`,
        path.join(__dirname, `./output_${frame}.png`)
      );
      yield ctx.commit();
      // TODO: Check
      // job results are valid // and reject by:
      // task.reject_task(msg = 'invalid file')
      task.accept_task();
    }

    ctx.log("no more frames to render");
    return;
  }

  let frames: number[] = range(0, 60, 10);

  await asyncWith(
    await new Engine(
      _package,
      6,
      900000, //5 min to 30 min
      "10.0",
      undefined,
      "testnet"
    ),
    async (engine) => {
      for await (let progress of engine.map(
        worker,
        frames.map((frame) => new Task(frame))
      )) {
        console.log("progress=", progress);
      }
    }
  );
  return;
}

main();
