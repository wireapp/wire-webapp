export default class TransientBundle {
  public expires: number;
  public payload: any;
  public timeoutID?: number | NodeJS.Timer; // Note: Only cached values have a "timeoutID"
}
