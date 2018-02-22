export default class TransientBundle {
  public expires: number = 0;
  public payload: any;
  public timeoutID?: number | NodeJS.Timer; // Note: Only cached values have a "timeoutID"
}
