import {
    Scene, BackSide, Group, Vector3,
    Mesh, MeshBasicMaterial, OctahedronGeometry
} from "three";
import TWEEN, { Tween } from "@tweenjs/tween.js";
import { UIManager } from "./UIManager";

export type MarkerData = {
    "title": string,
    "mapNormalizedPosition": {
        "x": number,
        "y": number,
        "z": number
    }
}

export class Marker {
    public static readonly additionalOffsetZ = 0.07;
    public static readonly multiplierScaleZ = 1.5;
    private readonly _data: MarkerData;
    public get data(): MarkerData { return this._data };

    public get colliderMesh(): Mesh { return this._colliderMesh };
    private readonly _colliderMesh: Mesh;
    public get wireframeMesh(): Mesh { return this._wireframeMesh };
    private readonly _wireframeMesh: Mesh;
    public get coloredMesh(): Mesh { return this._coloredMesh };
    private readonly _coloredMesh: Mesh;

    public get visualGroup(): Group { return this._visualGroup }
    private _visualGroup: Group = new Group();

    public get isSelected(): boolean { return this._isSelected };
    private _isSelected: boolean = false;

    constructor(markerData: MarkerData) {
        this._data = markerData;
        this._colliderMesh = new Mesh(
            new OctahedronGeometry(0.075),
            new MeshBasicMaterial({ visible: false} ));
        this._colliderMesh.scale.setComponent(2, Marker.multiplierScaleZ);
        this._colliderMesh.userData = { marker: this };

        this._wireframeMesh = new Mesh(
            new OctahedronGeometry(0.025),
            new MeshBasicMaterial( { wireframe: true } ));

        this._coloredMesh = new Mesh(
            new OctahedronGeometry(0.035),
            new MeshBasicMaterial( { wireframe: false, color: 0x000000, side: BackSide } ));
    }

    public initOnMap = (scene: Scene,
                        mapWidth: number,
                        mapHeight: number,
                        displacementScale: number,
                        displacementBias: number): void => {
        this._colliderMesh.position.copy(new Vector3(
            mapWidth * (this._data.mapNormalizedPosition.x - 0.5),
            mapHeight * (this._data.mapNormalizedPosition.y - 0.5),
            this._data.mapNormalizedPosition.z * displacementScale + displacementBias + Marker.additionalOffsetZ));
        scene.add(this._colliderMesh);

        scene.add(this._visualGroup);
        scene.add(this._wireframeMesh);
        this._visualGroup.add(this._coloredMesh, this._wireframeMesh);
        this._visualGroup.parent = this._colliderMesh;
    }

    public setMouseOveringStyle = (isEntering: boolean): void => {
        new Tween(this._visualGroup.scale)
            .to(new Vector3().setScalar(isEntering ? 1.3 : 1), 250)
            .start()
            .onComplete(() => {
                UIManager.setTitle(isEntering || this._isSelected ? "Wonder of the world" : "Wonders of the world");
                UIManager.setWonderNameTitle(isEntering || this._isSelected ? this.data.title : "");
            });
    }

    public beSelected = (isSelected: boolean): void => {
        new Tween(this._colliderMesh.rotation)
            .to({
                z: isSelected ?  6 * -Math.PI / 2 : 0,
                    y: isSelected ? -Math.PI / 2 : 0
                },
                2000)
            .easing(TWEEN.Easing.Exponential.In)
            .start();

        this._isSelected = isSelected;
    }
}