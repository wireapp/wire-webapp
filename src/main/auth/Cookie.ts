class Cookie {
  public expiration: string = '0';
  public zuid: string = '';

  constructor(zuid: string, expiration: string) {
    this.expiration = expiration;
    this.zuid = zuid;
  }

  public get isExpired(): boolean {
    return new Date() > new Date(this.expiration);
  }
}

export {Cookie};
