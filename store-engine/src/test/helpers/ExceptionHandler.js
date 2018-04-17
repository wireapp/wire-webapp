if (typeof window === 'undefined') {
  process.on('uncaughtException', error => {
    console.error(`Unhandled error: ${error.message}`, error.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', error => {
    console.error(`Unhandled Promise rejection: ${error.message}`, error.stack);
    process.exit(1);
  });
}
