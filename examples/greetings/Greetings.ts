import path from "path";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { Engine, Task, utils, vm, WorkContext } from "yajsapi";
import { logSummary } from "yajsapi/dist/utils/log";
import { program } from "commander";

dayjs.extend(duration);

const { asyncWith, range } = utils;

async function main(subnetTag: string) {
  const _package = await vm.repo(
    "9a3b5d67b0b27746283cb5f287c13eab1beaa12d92a9f536b747c7ae",
    0.5,
    2.0
  );

  async function* worker(ctx: WorkContext, tasks) {
    const args: any = ["-c", "echo 'Hello World!' > /golem/output/greetings.txt;"]
    for await (let task of tasks) {
      ctx.run("/bin/sh",
              args)
      const output_file = "greetings.txt"
      ctx.download_file(
        `/golem/output/${output_file}`,
        path.join(__dirname, `./${output_file}`)
      );
      yield ctx.commit();
      // TODO: Check
      // job results are valid // and reject by:
      // task.reject_task(msg = 'invalid file')
      task.accept_task(output_file);
    }

    ctx.log("You've been greeted!\n");
    return;
  }

  const timeout: number = dayjs.duration({ minutes: 15 }).asMilliseconds();
  const tasks: any[] = range(0, 1, 1);
  await asyncWith(
    await new Engine(
      _package,
      6,
      timeout, //5 min to 30 min
      "10.0",
      undefined,
      subnetTag,
      logSummary()
    ),
    async (engine: Engine): Promise<void> => {
      for await (let task of engine.map(
        worker,
        tasks.map((data) => new Task(data))
      )) {
        console.log("result=", task.output());
      }
    }
  );
  return;
}

program
  .option('--subnet-tag <subnet>', 'set subnet name', 'community.3')
  .option('-d, --debug', 'output extra debugging');
program.parse(process.argv);
if (program.debug) {
  utils.changeLogLevel("debug");
}
console.log(`Using subnet: '${program.subnetTag}'`);
main(program.subnetTag);
