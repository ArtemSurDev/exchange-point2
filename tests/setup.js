import '@testing-library/jest-dom'

// Minimal canvas mock for Chart.js in jsdom.
HTMLCanvasElement.prototype.getContext = () => {
    return {
        canvas: document.createElement('canvas'),
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        resetTransform: () => {}
    }
}

HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'
