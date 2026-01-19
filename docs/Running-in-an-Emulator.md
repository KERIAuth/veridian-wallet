# Running in an Emulator

## Requirements
### iOS Build
Ensure you have the latest version of the following programs installed on your Mac:
 - Xcode
 - Xcode Command Line Tools
 - CocoaPods
### Android Build
 - Android Studio: Make sure you have the latest version of Android Studio.

For more information, check the [Capacitor Environment Setup guide](https://capacitorjs.com/docs/getting-started/environment-setup).

## Build the app
```bash
npm run build:cap
```

## Running on Xcode Emulator
- Open the iOS Simulator: Open Xcode, navigate to `Xcode > Open Developer Tool > Simulator`.
- Select the desired iOS Device: Choose an iOS device model from the simulator list.
- Run the Application: In your project directory, execute `npx cap open ios`. This will open your project in Xcode. From here, you can build and run the application on the selected simulator. 
As alternative, you can open the file `App.xcworkspace` directly in Xcode from `ios/App` folder. 

## Running on Android Studio Emulator
- Setup Android Emulator: Open Android Studio, go to `Tools > AVD Manager` and create a new Android Virtual Device (AVD) or select an existing one.
- Run the Application: Navigate to your project directory and run `npx cap open android`. This will open your project in Android Studio. Build and run the application on your chosen emulator.
As alternative, you can open the folder `android` directly in Android Studio.

### Android Emulator Network Configuration
The app automatically detects when running on an Android emulator and uses `10.0.2.2` (the emulator's special alias for the host machine) to connect to Keria running in Docker on your local machine. This means:
- **No manual configuration needed**: The app automatically uses `10.0.2.2` instead of `localhost` when running on Android emulator
- **Keria must be running**: Ensure Keria is running in Docker and accessible on your host machine (e.g., `http://localhost:3901`)
- **Network security**: The app includes a network security config that allows cleartext HTTP traffic to `10.0.2.2` for development

If you need to override this behavior (e.g., for testing with a different IP), you can set the `KERIA_IP` environment variable.

In addition to using the emulators, you can also run the identity wallet directly on a real mobile device, providing a more authentic user experience and testing environment.  This approach requires the device to be tethered via cable to your computer running Xcode and/or Android Studio and the developer options must be enabled.  For further instructions: [Xcode](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device) and [Android Studio](https://developer.android.com/studio/run/device).