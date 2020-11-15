import {
    Scene, Camera, Group, PointLight,
    Mesh, MeshBasicMaterial, Line, LineBasicMaterial,
    RingGeometry, PlaneGeometry, BufferGeometry,
    Raycaster, Vector2, Vector3, MathUtils, Object3D, Color
} from "/build/three.module.js";
import { TWEEN } from "/jsm/libs/tween.module.min";
import { Marker, MarkerData } from "./Marker.js";

export class MapCursor {
    private _cursor: Group = new Group();
    private _ring: Mesh;
    private _ringMaterial: MeshBasicMaterial;
    private _ringSrcData = {
        innerRadius: 0.035,
        outerRadius: 0.0425,
        thetaSegments: 16
    };
    private _ringData = {
        innerRadius: this._ringSrcData.innerRadius,
        outerRadius: this._ringSrcData.outerRadius,
        thetaSegments: this._ringSrcData.thetaSegments
    };
    private _light: PointLight;
    private _verticalLine: Line;
    private _horizontalLine: Line;

    private _scene: Scene;
    private readonly _camera: Camera;
    private readonly _mapMesh: Mesh;
    private _markersGroup: Group;

    private _currentMarker: Object3D = null;
    private _lastMarkerPosition: Vector3 = new Vector3();

    private _raycaster: Raycaster = new Raycaster();
    private _mapPosition: Vector3 = new Vector3();
    private _magnetizationToMarker = {
        value: 0,
        duration: 500
    };

    constructor(scene: Scene, camera: Camera, mapMesh: Mesh, mapMarkersGroup: Group) {
        this._scene = scene;
        this._camera = camera;
        this._mapMesh = mapMesh;
        this._markersGroup = mapMarkersGroup;
        this.init();
    } 

    private init = (): void => {
        this._light = new PointLight(0xffffff, 3, 0.5)
        this._light.position.z = 0.15;

        this._ringMaterial = new MeshBasicMaterial({ color: 0xffffff });
        this._ring = new Mesh(
            new RingGeometry(
                this._ringSrcData.innerRadius,
                this._ringSrcData.outerRadius,
                this._ringSrcData.thetaSegments),
            this._ringMaterial
            );

        this._cursor.add(this._ring);
        this._scene.add(this._cursor, this._light);

        const planeGeometry = <PlaneGeometry>this._mapMesh.geometry;
        const lineMaterial = new LineBasicMaterial({ color: 0xd0d0d0 });

        const lineVerticalGeometry = new BufferGeometry().setFromPoints([
            new Vector3(0,  planeGeometry.parameters.height / 2, 0),
            new Vector3(0, -planeGeometry.parameters.height / 2, 0)]);
        this._verticalLine = new Line(lineVerticalGeometry, lineMaterial);

        const lineHorizontalGeometry = new BufferGeometry().setFromPoints([
            new Vector3(planeGeometry.parameters.width / 2, 0, 0),
            new Vector3(-planeGeometry.parameters.width / 2, 0, 0)]);
        this._horizontalLine = new Line(lineHorizontalGeometry, lineMaterial);

        this._scene.add(this._horizontalLine, this._verticalLine);
    }

    public update = (): void => {
        TWEEN.update();
        this.setCursorPositionMagically();
    }

    public positioning = (mousePosition: Vector2) => {
        const mouseCoords = {
            x: (mousePosition.x / window.innerWidth) * 2 - 1,
            y: -(mousePosition.y / window.innerHeight) * 2 + 1
        };

        this._raycaster.setFromCamera(mouseCoords, this._camera);

        const mapIntersection = this._raycaster.intersectObject(this._mapMesh)[0];

        mapIntersection != null &&
        this._mapPosition.copy(mapIntersection.point);

        const markerIntersection = this._raycaster.intersectObjects(this._markersGroup.children)[0];

        if (markerIntersection == null){
            this._currentMarker != null &&
            this.onMarkerExit(this._currentMarker);
        } else {
            if (this._currentMarker == null) {
                this.onMarkerEnter(markerIntersection.object);
            } else {
                if (this._currentMarker != markerIntersection.object) {
                    this.onMarkerExit(this._currentMarker);
                    this.onMarkerEnter(markerIntersection.object);
                }
            }
        }
    }

    private setCursorPositionMagically = (): void => {
        const position = new Vector3().lerpVectors(
            this._mapPosition,
            this._currentMarker != null ? this._currentMarker.position : this._lastMarkerPosition,
            this._magnetizationToMarker.value);
        const alpha = 0.15;

        this._cursor.position.lerpVectors(this._cursor.position, position, alpha);

        this._horizontalLine.position.y = MathUtils.lerp(this._horizontalLine.position.y, position.y, alpha);
        this._verticalLine.position.x = MathUtils.lerp(this._verticalLine.position.x, position.x, alpha);

        this._light.position.x = this._mapPosition.x;
        this._light.position.y = this._mapPosition.y;
    }

    private onMarkerEnter = (markerObject: Object3D): void => {
        this._currentMarker = markerObject;
        document.body.style.cursor = 'pointer';

        const marker = <Marker>markerObject.userData.marker;
        marker.setMouseEnterStyle();

        TWEEN.removeAll();

        new TWEEN.Tween(this._magnetizationToMarker)
            .to({ value: 0.9 }, this._magnetizationToMarker.duration)
            .start();

        let tempColor = { hex: this._ringMaterial.color.getHex() };
        new TWEEN.Tween(tempColor)
            .to({ hex: new Color(0x000000).getHex() }, this._magnetizationToMarker.duration / 2)
            .start()
            .onUpdate(() => this._ringMaterial.color.setHex(tempColor.hex));

        this.tweenRingGeometry(
            0.001,
            0.065,
            4,
            this._magnetizationToMarker.duration / 2);
    }

    private onMarkerExit = (markerObject: Object3D): void => {
        this._lastMarkerPosition.copy(this._currentMarker.position);
        this._currentMarker = null;
        document.body.style.cursor = 'default';

        const marker = <Marker>markerObject.userData.marker;
        marker.setMouseExitStyle();

        TWEEN.removeAll();

        new TWEEN.Tween(this._magnetizationToMarker)
            .to({ value: 0 }, this._magnetizationToMarker.duration)
            .start();

        let tempColor = { hex: this._ringMaterial.color.getHex() };
        new TWEEN.Tween(tempColor)
            .to({ hex: new Color(0xffffff).getHex() }, this._magnetizationToMarker.duration / 2)
            .start()
            .onUpdate(() => this._ringMaterial.color.setHex(tempColor.hex));

        this.tweenRingGeometry(
            0.035,
            0.0425,
            16,
            this._magnetizationToMarker.duration);
    }

    private tweenRingGeometry = (innerRadius: number,
                                 outerRadius: number,
                                 thetaSegments: number,
                                 duration: number): void => {
        new TWEEN.Tween(this._ringData)
            .to({ innerRadius, outerRadius, thetaSegments }, duration)
            .start()
            .onUpdate(() => {
                this._ring.geometry.dispose();
                this._ring.geometry = new RingGeometry(
                    this._ringData.innerRadius,
                    this._ringData.outerRadius,
                    Math.round(this._ringData.thetaSegments)
                )
            })
    }
}