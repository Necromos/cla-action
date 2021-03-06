import * as core from '@actions/core'

const persistanceRepository = core.getInput('persistance-repository')

export default function isForkedPRRun(): boolean{
  return persistanceRepository !== '' && !process.env.PERSISTANCE_GITHUB_TOKEN;
}
