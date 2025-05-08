---

# StargledPanelSimple

## Overview

StargledPanelSimple is a web-based server management panel designed to facilitate the management of server files and processes. This application provides a user-friendly interface for uploading, downloading, and managing files on the server. It also includes real-time server monitoring capabilities and allows users to start, stop, and send commands to a server process, potentially a Minecraft server.

## Features

- **File Management**: Upload, download, create, delete, and rename files and folders on the server.
- **Real-time Monitoring**: View system statistics such as CPU and RAM usage, and server folder size.
- **Server Control**: Start, stop, and send commands to the server process.
- **Settings Management**: Configure server startup scripts and other settings through a dedicated settings page.
- **User Interface**: Built with EJS templates for rendering dynamic web pages.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MorishimaKureo/StargledPanelSimple.git
   ```

2. **Navigate to the project directory**:
   ```bash
   cd StargledPanelSimple
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

1. **Start the server**:
   ```bash
   node .
   ```

2. **Access the application**:
   Open your web browser and go to `http://localhost:3000`.

## Configuration

- **Settings**: Modify the `settings.json` file to change the server startup script and other configurations.
- **Server Properties**: Edit the `server.properties` file located in the `server` directory to configure server-specific settings.

## Dependencies

- **Express**: For handling HTTP requests and serving static files.
- **Socket.IO**: For real-time communication between the server and clients.
- **Multer**: For handling file uploads.
- **EJS**: For rendering dynamic HTML pages.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
